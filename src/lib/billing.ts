import type { LineRow, PackageRow, PaymentRow } from "@/db/schema";
import { daysBetween, type IsoDate } from "./dates";
import { periodForDate, periodsBetween, type BillingCycle } from "./periods";

/** بداية الفوترة الفعلية: تاريخ الشريحة أو تاريخ تفعيل خصم الباقة. */
export function effectiveBillingStart(
  line: Pick<LineRow, "billingStart">,
  pkg: Pick<PackageRow, "discountStart">,
): IsoDate {
  return line.billingStart ?? pkg.discountStart;
}

export interface LineBilling {
  start: IsoDate;
  /** دورة الفوترة، أو null للشريحة المجانية */
  cycle: BillingCycle | null;
  /** شريحة مجانية: لا فترات ولا مستحقات */
  free: boolean;
  /** كل الفترات من البداية حتى اليوم تصاعدياً (فارغة إذا كانت البداية مستقبلية أو الشريحة مجانية). */
  periods: string[];
  paid: string[];
  unpaid: string[];
  currentPeriod: string;
  currentPaid: boolean;
  startsInFuture: boolean;
  /** مبلغ الفاتورة الواحدة بالهللات، أو null إن لم يُحدَّد */
  amountHalalas: number | null;
  /** المستحق = عدد الفترات غير المدفوعة × مبلغ الفاتورة؛ null إن لم يُحدَّد مبلغ */
  dueHalalas: number | null;
}

export function lineBilling(
  line: Pick<LineRow, "billingStart" | "billingCycle"> & {
    amountHalalas?: number | null;
    payments: Array<Pick<PaymentRow, "period">>;
  },
  pkg: Pick<PackageRow, "discountStart">,
  today: IsoDate,
): LineBilling {
  const start = effectiveBillingStart(line, pkg);
  if (line.billingCycle === "free") {
    return {
      start,
      cycle: null,
      free: true,
      periods: [],
      paid: [],
      unpaid: [],
      currentPeriod: "",
      currentPaid: true,
      startsInFuture: false,
      amountHalalas: null,
      dueHalalas: null,
    };
  }
  const cycle = line.billingCycle;
  const startsInFuture = daysBetween(today, start) > 0;
  const periods = startsInFuture ? [] : periodsBetween(start, today, cycle);
  const paidSet = new Set(line.payments.map((p) => p.period));
  const paid = periods.filter((p) => paidSet.has(p));
  const unpaid = periods.filter((p) => !paidSet.has(p));
  const currentPeriod = periodForDate(today, cycle);
  const amountHalalas = line.amountHalalas ?? null;
  return {
    start,
    cycle,
    free: false,
    periods,
    paid,
    unpaid,
    currentPeriod,
    currentPaid: startsInFuture ? true : paidSet.has(currentPeriod),
    startsInFuture,
    amountHalalas,
    dueHalalas: amountHalalas == null ? null : unpaid.length * amountHalalas,
  };
}
