import type { PackageWithLines } from "@/db/queries";
import { lineBilling } from "./billing";
import { dateStatus, daysBetween, type DateStatus, type IsoDate } from "./dates";
import type { BillingCycle } from "./periods";
import type { LineType } from "./slots";

export type DateKind = "discountEnd" | "cashbackEnd";

export interface UpcomingDate {
  packageId: number;
  packageName: string;
  kind: DateKind;
  date: IsoDate;
  status: Exclude<DateStatus, "unset">;
  daysLeft: number;
}

export interface UnpaidItem {
  packageId: number;
  packageName: string;
  lineId: number;
  slot: number;
  type: LineType;
  holderName: string | null;
  cycle: BillingCycle;
  period: string;
}

export interface PackageSummary {
  id: number;
  name: string;
  discountStart: IsoDate;
  discountEnd: IsoDate | null;
  cashbackEnd: IsoDate | null;
  discountStatus: DateStatus;
  cashbackStatus: DateStatus;
  filledLines: number;
  unpaidPeriods: number;
  /** الأشخاص (أصحاب الشرائح) بترتيب الشرائح */
  people: Array<{ slot: number; type: LineType; holderName: string | null; phoneNumber: string | null }>;
}

export interface UnpaidGroup {
  packageId: number;
  packageName: string;
  items: UnpaidItem[];
}

export interface DashboardData {
  tiles: { packages: number; lines: number; unpaidCurrent: number; endingSoon: number };
  upcoming: UpcomingDate[];
  unpaid: UnpaidItem[];
  /** نفس عناصر unpaid مجمّعة حسب الباقة لعرض أكثر إيجازاً */
  unpaidGroups: UnpaidGroup[];
  packages: PackageSummary[];
}

function isFilled(line: PackageWithLines["lines"][number]): boolean {
  // نفس ما تعرضه بطاقة الباقة: الشخص مسجّل إذا كان له اسم أو رقم جوال
  return Boolean(line.holderName || line.phoneNumber);
}

export function buildDashboard(pkgs: PackageWithLines[], today: IsoDate): DashboardData {
  const upcoming: UpcomingDate[] = [];
  const unpaid: UnpaidItem[] = [];
  const summaries: PackageSummary[] = [];
  let lineCount = 0;

  for (const pkg of pkgs) {
    for (const kind of ["discountEnd", "cashbackEnd"] as const) {
      const date = pkg[kind];
      const status = dateStatus(date, today);
      if (date && status !== "unset") {
        upcoming.push({ packageId: pkg.id, packageName: pkg.name, kind, date, status, daysLeft: daysBetween(today, date) });
      }
    }

    let unpaidPeriods = 0;
    for (const line of pkg.lines) {
      lineCount += 1;
      const billing = lineBilling(line, pkg, today);
      unpaidPeriods += billing.unpaid.length;
      if (!billing.currentPaid) {
        unpaid.push({
          packageId: pkg.id,
          packageName: pkg.name,
          lineId: line.id,
          slot: line.slot,
          type: line.type,
          holderName: line.holderName,
          cycle: line.billingCycle,
          period: billing.currentPeriod,
        });
      }
    }

    summaries.push({
      id: pkg.id,
      name: pkg.name,
      discountStart: pkg.discountStart,
      discountEnd: pkg.discountEnd,
      cashbackEnd: pkg.cashbackEnd,
      discountStatus: dateStatus(pkg.discountEnd, today),
      cashbackStatus: dateStatus(pkg.cashbackEnd, today),
      filledLines: pkg.lines.filter(isFilled).length,
      unpaidPeriods,
      people: [...pkg.lines]
        .sort((a, b) => a.slot - b.slot)
        .map((l) => ({ slot: l.slot, type: l.type, holderName: l.holderName, phoneNumber: l.phoneNumber })),
    });
  }

  // القادمة أولاً (الأقرب فالأبعد)، ثم المنتهية (الأحدث انتهاءً أولاً).
  upcoming.sort((a, b) => {
    const aEnded = a.status === "ended";
    const bEnded = b.status === "ended";
    if (aEnded !== bEnded) return aEnded ? 1 : -1;
    return aEnded ? b.daysLeft - a.daysLeft : a.daysLeft - b.daysLeft;
  });

  const unpaidGroups: UnpaidGroup[] = [];
  for (const item of unpaid) {
    const group = unpaidGroups.find((g) => g.packageId === item.packageId);
    if (group) group.items.push(item);
    else unpaidGroups.push({ packageId: item.packageId, packageName: item.packageName, items: [item] });
  }

  return {
    tiles: {
      packages: pkgs.length,
      lines: lineCount,
      unpaidCurrent: unpaid.length,
      endingSoon: upcoming.filter((u) => u.status === "ending_soon").length,
    },
    upcoming,
    unpaid,
    unpaidGroups,
    packages: summaries,
  };
}
