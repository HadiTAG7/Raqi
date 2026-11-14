import type { LineRow, PackageInvoiceRow, PackageRow, PaymentRow } from "@/db/schema";
import { lineBilling } from "./billing";
import { daysBetween, type IsoDate } from "./dates";
import { periodsBetween, type BillingCycle } from "./periods";

/** فاتورة باقة لفترة واحدة كما تُعرض (موجودة في القاعدة أو لا). */
export interface PackageInvoiceView {
  period: string;
  /** مبلغ الفاتورة بالهللات، أو null إن لم يُسجَّل */
  amountHalalas: number | null;
  /** مدفوعة للشركة */
  paid: boolean;
}

/** إجماليات فواتير الباقة (تُحسب من قائمة الفواتير فقط، فتصلح للتحديث الفوري في الواجهة). */
export interface PackageInvoiceTotals {
  /** مجموع مبالغ الفواتير المسجّلة */
  recordedHalalas: number;
  /** مجموع مبالغ الفواتير المدفوعة للشركة */
  paidHalalas: number;
  /** مجموع مبالغ الفواتير غير المدفوعة (التي لها مبلغ) */
  owedHalalas: number;
  /** عدد الفواتير غير المدفوعة (بمبلغ أو بدونه) */
  unpaidCount: number;
  /** عدد الفواتير التي لم يُسجَّل مبلغها */
  missingAmountCount: number;
}

/** ما يخص الأشخاص في نفس الباقة، للمقارنة مع فواتيرها. */
export interface PeopleTotals {
  /** المطلوب من الأشخاص حتى اليوم = Σ (عدد فترات الشخص × مبلغ فاتورته) */
  expectedHalalas: number;
  /** المحصّل = Σ (فترات مدفوعة × المبلغ) */
  collectedHalalas: number;
  /** المتبقي عليهم = Σ (فترات غير مدفوعة × المبلغ) */
  dueHalalas: number;
  /** أشخاص غير مجانيين بلا مبلغ (لم يدخلوا في الحساب) */
  unpricedCount: number;
}

export interface PackageBilling extends PackageInvoiceTotals {
  cycle: BillingCycle;
  /** بداية فواتير الباقة (تاريخ تفعيل الخصم) */
  start: IsoDate;
  startsInFuture: boolean;
  /** كل فترات الباقة من البداية حتى اليوم تصاعدياً */
  invoices: PackageInvoiceView[];
  people: PeopleTotals;
  /** المطلوب من الأشخاص − فواتير الباقة المسجّلة: موجب = فائض، سالب = تتحمّله أنت */
  differenceHalalas: number;
}

/** فترات الباقة الحالية مع ما سُجّل لها. الصفوف المخزّنة لفترات خارج النطاق (بعد تغيير الدورة) لا تُعرض. */
export function packageInvoiceViews(
  pkg: Pick<PackageRow, "discountStart" | "billCycle"> & { invoices: Array<Pick<PackageInvoiceRow, "period" | "amountHalalas" | "paidAt">> },
  today: IsoDate,
): PackageInvoiceView[] {
  if (daysBetween(today, pkg.discountStart) > 0) return [];
  const stored = new Map(pkg.invoices.map((inv) => [inv.period, inv]));
  return periodsBetween(pkg.discountStart, today, pkg.billCycle).map((period) => {
    const row = stored.get(period);
    return { period, amountHalalas: row?.amountHalalas ?? null, paid: row?.paidAt != null };
  });
}

export function packageInvoiceTotals(invoices: PackageInvoiceView[]): PackageInvoiceTotals {
  const totals: PackageInvoiceTotals = { recordedHalalas: 0, paidHalalas: 0, owedHalalas: 0, unpaidCount: 0, missingAmountCount: 0 };
  for (const inv of invoices) {
    if (inv.amountHalalas == null) totals.missingAmountCount += 1;
    else {
      totals.recordedHalalas += inv.amountHalalas;
      if (inv.paid) totals.paidHalalas += inv.amountHalalas;
      else totals.owedHalalas += inv.amountHalalas;
    }
    if (!inv.paid) totals.unpaidCount += 1;
  }
  return totals;
}

export function peopleTotals(
  pkg: Pick<PackageRow, "discountStart"> & {
    lines: Array<Pick<LineRow, "billingStart" | "billingCycle" | "amountHalalas"> & { payments: Array<Pick<PaymentRow, "period">> }>;
  },
  today: IsoDate,
): PeopleTotals {
  const totals: PeopleTotals = { expectedHalalas: 0, collectedHalalas: 0, dueHalalas: 0, unpricedCount: 0 };
  for (const line of pkg.lines) {
    const billing = lineBilling(line, pkg, today);
    if (billing.free) continue;
    if (billing.amountHalalas == null) {
      totals.unpricedCount += 1;
      continue;
    }
    totals.expectedHalalas += billing.periods.length * billing.amountHalalas;
    totals.collectedHalalas += billing.paid.length * billing.amountHalalas;
    totals.dueHalalas += billing.unpaid.length * billing.amountHalalas;
  }
  return totals;
}

export function packageBilling(
  pkg: Pick<PackageRow, "discountStart" | "billCycle"> & {
    invoices: Array<Pick<PackageInvoiceRow, "period" | "amountHalalas" | "paidAt">>;
    lines: Array<Pick<LineRow, "billingStart" | "billingCycle" | "amountHalalas"> & { payments: Array<Pick<PaymentRow, "period">> }>;
  },
  today: IsoDate,
): PackageBilling {
  const invoices = packageInvoiceViews(pkg, today);
  const totals = packageInvoiceTotals(invoices);
  const people = peopleTotals(pkg, today);
  return {
    cycle: pkg.billCycle,
    start: pkg.discountStart,
    startsInFuture: daysBetween(today, pkg.discountStart) > 0,
    invoices,
    ...totals,
    people,
    differenceHalalas: people.expectedHalalas - totals.recordedHalalas,
  };
}
