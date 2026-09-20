import { expect, test } from "@playwright/test";
import { effectiveBillingStart, lineBilling } from "../../src/lib/billing";

const pkg = { discountStart: "2026-06-15" };
const today = "2026-09-20";

test("billingStart الفارغ يرجع إلى تاريخ تفعيل الخصم", () => {
  expect(effectiveBillingStart({ billingStart: null }, pkg)).toBe("2026-06-15");
  expect(effectiveBillingStart({ billingStart: "2026-08-01" }, pkg)).toBe("2026-08-01");
});

test("lineBilling الشهري يحسب المدفوع وغير المدفوع والفترة الحالية", () => {
  const result = lineBilling({ billingStart: null, billingCycle: "monthly", payments: [{ period: "2026-07" }, { period: "2026-09" }] }, pkg, today);
  expect(result.start).toBe("2026-06-15");
  expect(result.periods).toEqual(["2026-06", "2026-07", "2026-08", "2026-09"]);
  expect(result.paid).toEqual(["2026-07", "2026-09"]);
  expect(result.unpaid).toEqual(["2026-06", "2026-08"]);
  expect(result.currentPeriod).toBe("2026-09");
  expect(result.currentPaid).toBe(true);
  expect(result.startsInFuture).toBe(false);
});

test("lineBilling السنوي", () => {
  const result = lineBilling({ billingStart: "2024-01-01", billingCycle: "yearly", payments: [{ period: "2024" }] }, pkg, today);
  expect(result.periods).toEqual(["2024", "2025", "2026"]);
  expect(result.unpaid).toEqual(["2025", "2026"]);
  expect(result.currentPaid).toBe(false);
});

test("بداية مستقبلية تعطي شبكة فارغة ولا تُحسب غير مدفوعة", () => {
  const result = lineBilling({ billingStart: "2026-11-01", billingCycle: "monthly", payments: [] }, pkg, today);
  expect(result.startsInFuture).toBe(true);
  expect(result.periods).toEqual([]);
  expect(result.unpaid).toEqual([]);
  expect(result.currentPaid).toBe(true);
});
