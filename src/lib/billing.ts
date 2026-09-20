import type { LineRow, PackageRow, PaymentRow } from "@/db/schema";
import { daysBetween, type IsoDate } from "./dates";
import { periodForDate, periodsBetween } from "./periods";

/** بداية الفوترة الفعلية: تاريخ الشريحة أو تاريخ تفعيل خصم الباقة. */
export function effectiveBillingStart(
  line: Pick<LineRow, "billingStart">,
  pkg: Pick<PackageRow, "discountStart">,
): IsoDate {
  return line.billingStart ?? pkg.discountStart;
}

export interface LineBilling {
  start: IsoDate;
  /** كل الفترات من البداية حتى اليوم تصاعدياً (فارغة إذا كانت البداية مستقبلية). */
  periods: string[];
  paid: string[];
  unpaid: string[];
  currentPeriod: string;
  currentPaid: boolean;
  startsInFuture: boolean;
}

export function lineBilling(
  line: Pick<LineRow, "billingStart" | "billingCycle"> & { payments: Array<Pick<PaymentRow, "period">> },
  pkg: Pick<PackageRow, "discountStart">,
  today: IsoDate,
): LineBilling {
  const start = effectiveBillingStart(line, pkg);
  const startsInFuture = daysBetween(today, start) > 0;
  const periods = startsInFuture ? [] : periodsBetween(start, today, line.billingCycle);
  const paidSet = new Set(line.payments.map((p) => p.period));
  const paid = periods.filter((p) => paidSet.has(p));
  const unpaid = periods.filter((p) => !paidSet.has(p));
  const currentPeriod = periodForDate(today, line.billingCycle);
  return {
    start,
    periods,
    paid,
    unpaid,
    currentPeriod,
    currentPaid: startsInFuture ? true : paidSet.has(currentPeriod),
    startsInFuture,
  };
}
