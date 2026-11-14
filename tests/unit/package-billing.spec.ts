import { expect, test } from "@playwright/test";
import { packageBilling, packageInvoiceTotals } from "../../src/lib/package-billing";

const today = "2026-09-20";
const paidAt = "2026-01-01T00:00:00.000Z";

function inv(period: string, amountHalalas: number | null, paid = false) {
  return { period, amountHalalas, paidAt: paid ? paidAt : null };
}

function line(amountHalalas: number | null, paidPeriods: string[] = [], billingCycle: "monthly" | "yearly" | "free" = "monthly", billingStart: string | null = null) {
  return { billingStart, billingCycle, amountHalalas, payments: paidPeriods.map((period) => ({ period })) };
}

test("فترات الباقة الشهرية من تفعيل الخصم حتى اليوم مع المبالغ والحالة", () => {
  const result = packageBilling({ discountStart: "2026-07-15", billCycle: "monthly", invoices: [inv("2026-07", 30000, true), inv("2026-09", 31050)], lines: [] }, today);
  expect(result.invoices).toEqual([
    { period: "2026-07", amountHalalas: 30000, paid: true },
    { period: "2026-08", amountHalalas: null, paid: false },
    { period: "2026-09", amountHalalas: 31050, paid: false },
  ]);
  expect(result).toMatchObject({
    cycle: "monthly",
    startsInFuture: false,
    recordedHalalas: 61050,
    paidHalalas: 30000,
    owedHalalas: 31050,
    unpaidCount: 2,
    missingAmountCount: 1,
  });
});

test("الدورة السنوية، وتجاهل الصفوف المخزّنة خارج النطاق (بعد تغيير الدورة)", () => {
  const result = packageBilling(
    { discountStart: "2025-03-10", billCycle: "yearly", invoices: [inv("2025", 300000, true), inv("2026", 320000), inv("2026-08", 99999)], lines: [] },
    today,
  );
  expect(result.invoices.map((i) => i.period)).toEqual(["2025", "2026"]);
  expect(result.recordedHalalas).toBe(620000);
  expect(result.owedHalalas).toBe(320000);
});

test("باقة تبدأ مستقبلاً: لا فواتير", () => {
  const result = packageBilling({ discountStart: "2026-10-01", billCycle: "monthly", invoices: [], lines: [line(5000)] }, today);
  expect(result.startsInFuture).toBe(true);
  expect(result.invoices).toEqual([]);
  expect(result.people.expectedHalalas).toBe(0);
  expect(result.differenceHalalas).toBe(0);
});

test("المقارنة مع الأشخاص: المطلوب والمحصّل والفرق، والمجاني ومن بلا مبلغ خارج الحساب", () => {
  // ثلاثة أشهر (يوليو–سبتمبر)، فاتورة الباقة 300 ريال شهرياً = 900
  const result = packageBilling(
    {
      discountStart: "2026-07-01",
      billCycle: "monthly",
      invoices: [inv("2026-07", 30000, true), inv("2026-08", 30000, true), inv("2026-09", 30000)],
      lines: [
        line(10000, ["2026-07", "2026-08"]), // 3 × 100 = 300، المحصّل 200
        line(5000, ["2026-07"]), // 3 × 50 = 150، المحصّل 50
        line(5000), // 150، المحصّل 0
        line(9900, [], "free"), // مجاني
        line(null), // بلا مبلغ
      ],
    },
    today,
  );
  expect(result.people).toEqual({ expectedHalalas: 60000, collectedHalalas: 25000, dueHalalas: 35000, unpricedCount: 1 });
  expect(result.recordedHalalas).toBe(90000);
  expect(result.differenceHalalas).toBe(-30000); // تتحمّل أنت 300
});

test("شخص سنوي في باقة شهرية يدخل بفتراته السنوية", () => {
  const result = packageBilling(
    { discountStart: "2026-01-01", billCycle: "monthly", invoices: [], lines: [line(120000, ["2026"], "yearly")] },
    today,
  );
  expect(result.people).toEqual({ expectedHalalas: 120000, collectedHalalas: 120000, dueHalalas: 0, unpricedCount: 0 });
  expect(result.missingAmountCount).toBe(9);
  expect(result.differenceHalalas).toBe(120000);
});

test("packageInvoiceTotals على قائمة فارغة", () => {
  expect(packageInvoiceTotals([])).toEqual({ recordedHalalas: 0, paidHalalas: 0, owedHalalas: 0, unpaidCount: 0, missingAmountCount: 0 });
});
