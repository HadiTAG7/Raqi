import { expect, test } from "@playwright/test";
import type { PackageWithLines } from "../../src/db/queries";
import { buildDashboard } from "../../src/lib/dashboard";

const today = "2026-09-20";

function pkg(overrides: Partial<PackageWithLines> & { id: number; name: string; discountStart: string }): PackageWithLines {
  return {
    notes: null,
    discountEnd: null,
    cashbackStart: null,
    cashbackEnd: null,
    billCycle: "monthly",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    lines: [],
    invoices: [],
    ...overrides,
  };
}

type Line = PackageWithLines["lines"][number];

function line(id: number, packageId: number, slot: number, payments: string[] = [], billingStart: string | null = null, overrides: Partial<Line> = {}): Line {
  return {
    id,
    packageId,
    slot,
    type: slot === 1 ? "primary" : slot <= 3 ? "international" : "local",
    holderName: slot === 1 ? "هادي" : null,
    phoneNumber: null,
    simReference: null,
    billingCycle: "monthly",
    amountHalalas: null,
    billingStart,
    notes: null,
    payments: payments.map((period, i) => ({ id: i + 1, lineId: id, period, paidAt: "2026-01-01T00:00:00.000Z" })),
    ...overrides,
  };
}

test("buildDashboard يحسب البطاقات ويرتّب التواريخ", () => {
  const data = buildDashboard(
    [
      pkg({ id: 1, name: "أ", discountStart: "2026-08-01", discountEnd: "2026-09-30", cashbackEnd: "2026-08-01", lines: [line(1, 1, 1, ["2026-08", "2026-09"]), line(2, 1, 2, ["2026-08"])] }),
      pkg({ id: 2, name: "ب", discountStart: "2026-09-01", discountEnd: "2027-01-01", lines: [line(3, 2, 1, [], "2026-12-01")] }),
    ],
    today,
  );

  expect(data.tiles).toEqual({ packages: 2, lines: 3, unpaidCurrent: 1, endingSoon: 1, totalDueHalalas: 0, companyOwedHalalas: 0 });
  expect(data.upcoming.map((u) => [u.packageName, u.kind, u.status, u.daysLeft])).toEqual([
    ["أ", "discountEnd", "ending_soon", 10],
    ["ب", "discountEnd", "active", 103],
    ["أ", "cashbackEnd", "ended", -50],
  ]);
  expect(data.unpaid).toHaveLength(1);
  expect(data.unpaidGroups).toEqual([{ packageId: 1, packageName: "أ", items: data.unpaid }]);
  expect(data.unpaid[0]).toMatchObject({ packageId: 1, lineId: 2, slot: 2, type: "international", period: "2026-09" });
  expect(data.packages[0]).toMatchObject({ id: 1, filledLines: 1, unpaidPeriods: 1, discountStatus: "ending_soon", cashbackStatus: "ended" });
  expect(data.packages[0].people).toEqual([
    { slot: 1, type: "primary", holderName: "هادي", phoneNumber: null, free: false, dueHalalas: null },
    { slot: 2, type: "international", holderName: null, phoneNumber: null, free: false, dueHalalas: null },
  ]);
  expect(data.packages[1]).toMatchObject({ id: 2, filledLines: 1, unpaidPeriods: 0, discountStatus: "active", cashbackStatus: "unset" });
});

test("بدون باقات", () => {
  const data = buildDashboard([], today);
  expect(data.tiles).toEqual({ packages: 0, lines: 0, unpaidCurrent: 0, endingSoon: 0, totalDueHalalas: 0, companyOwedHalalas: 0 });
  expect(data.upcoming).toEqual([]);
  expect(data.unpaidGroups).toEqual([]);
  expect(data.packages).toEqual([]);
});

test("المبالغ والمجانية: المستحق = غير المدفوع × مبلغ الفاتورة، والمجاني خارج الحساب", () => {
  // بداية الفوترة 1 يوليو واليوم 20 سبتمبر: ثلاث فترات شهرية (يوليو، أغسطس، سبتمبر)
  const data = buildDashboard(
    [
      pkg({
        id: 1,
        name: "أ",
        discountStart: "2026-07-01",
        lines: [
          line(1, 1, 1, ["2026-07"], null, { amountHalalas: 5000 }), // عليه شهران: 100 ريال
          line(2, 1, 2, [], null, { billingCycle: "free", amountHalalas: 9900 }), // مجاني: يُتجاهل المبلغ
          line(3, 1, 3, [], null, { amountHalalas: 5750 }), // 3 × 57.50 = 172.50
          line(4, 1, 4, ["2026-07", "2026-08", "2026-09"], null, { amountHalalas: 2000 }), // مدفوع بالكامل
          line(5, 1, 5), // بلا مبلغ
        ],
      }),
      pkg({ id: 2, name: "ب", discountStart: "2025-01-01", lines: [line(6, 2, 1, [], null, { billingCycle: "yearly", amountHalalas: 60000 })] }), // 2025 و2026 = 1200 ريال
    ],
    today,
  );

  expect(data.packages[0].people.map((p) => [p.slot, p.free, p.dueHalalas])).toEqual([
    [1, false, 10000],
    [2, true, null],
    [3, false, 17250],
    [4, false, 0],
    [5, false, null],
  ]);
  expect(data.packages[0].dueHalalas).toBe(27250);
  expect(data.packages[0].unpaidPeriods).toBe(2 + 0 + 3 + 0 + 3);
  expect(data.packages[1].dueHalalas).toBe(120000);
  expect(data.tiles.totalDueHalalas).toBe(147250);
  expect(data.tiles.lines).toBe(6);

  // غير المدفوع للفترة الحالية: المجاني (2) والمدفوع (4) خارج القائمة
  expect(data.unpaid.map((u) => [u.lineId, u.period, u.dueHalalas])).toEqual([
    [1, "2026-09", 10000],
    [3, "2026-09", 17250],
    [5, "2026-09", null],
    [6, "2026", 120000],
  ]);
  expect(data.tiles.unpaidCurrent).toBe(4);
});

test("المتبقي للشركة: مجموع فواتير الباقة غير المدفوعة التي لها مبلغ", () => {
  const inv = (period: string, amountHalalas: number | null, paid = false) => ({ id: 0, packageId: 0, period, amountHalalas, paidAt: paid ? "2026-01-01T00:00:00.000Z" : null });
  const data = buildDashboard(
    [
      pkg({ id: 1, name: "أ", discountStart: "2026-07-01", invoices: [inv("2026-07", 30000, true), inv("2026-08", 30000), inv("2026-09", null)] }),
      // سنوية: 2025 و2026، وفاتورة 2024 خارج النطاق لا تُحسب
      pkg({ id: 2, name: "ب", discountStart: "2025-03-10", billCycle: "yearly", invoices: [inv("2024", 99900), inv("2025", 250000), inv("2026", 260000, true)] }),
    ],
    today,
  );
  expect(data.packages.map((p) => [p.id, p.companyOwedHalalas])).toEqual([
    [1, 30000],
    [2, 250000],
  ]);
  expect(data.tiles.companyOwedHalalas).toBe(280000);
});
