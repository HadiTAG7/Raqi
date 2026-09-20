import { expect, test } from "@playwright/test";
import type { PackageWithLines } from "../../src/db/queries";
import { buildDashboard } from "../../src/lib/dashboard";

const today = "2026-09-20";

function pkg(overrides: Partial<PackageWithLines> & { id: number; name: string; discountStart: string }): PackageWithLines {
  return {
    notes: null,
    discountEnd: null,
    cashbackEnd: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    lines: [],
    ...overrides,
  };
}

function line(id: number, packageId: number, slot: number, payments: string[] = [], billingStart: string | null = null): PackageWithLines["lines"][number] {
  return {
    id,
    packageId,
    slot,
    type: slot === 1 ? "primary" : slot <= 3 ? "international" : "local",
    holderName: slot === 1 ? "هادي" : null,
    phoneNumber: null,
    simReference: null,
    billingCycle: "monthly",
    billingStart,
    notes: null,
    payments: payments.map((period, i) => ({ id: i + 1, lineId: id, period, paidAt: "2026-01-01T00:00:00.000Z" })),
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

  expect(data.tiles).toEqual({ packages: 2, lines: 3, unpaidCurrent: 1, endingSoon: 1 });
  expect(data.upcoming.map((u) => [u.packageName, u.kind, u.status, u.daysLeft])).toEqual([
    ["أ", "discountEnd", "ending_soon", 10],
    ["ب", "discountEnd", "active", 103],
    ["أ", "cashbackEnd", "ended", -50],
  ]);
  expect(data.unpaid).toHaveLength(1);
  expect(data.unpaidGroups).toEqual([{ packageId: 1, packageName: "أ", items: data.unpaid }]);
  expect(data.unpaid[0]).toMatchObject({ packageId: 1, lineId: 2, slot: 2, type: "international", period: "2026-09" });
  expect(data.packages[0]).toMatchObject({ id: 1, filledLines: 1, unpaidPeriods: 1, discountStatus: "ending_soon", cashbackStatus: "ended" });
  expect(data.packages[1]).toMatchObject({ id: 2, filledLines: 1, unpaidPeriods: 0, discountStatus: "active", cashbackStatus: "unset" });
});

test("بدون باقات", () => {
  const data = buildDashboard([], today);
  expect(data.tiles).toEqual({ packages: 0, lines: 0, unpaidCurrent: 0, endingSoon: 0 });
  expect(data.upcoming).toEqual([]);
  expect(data.unpaidGroups).toEqual([]);
  expect(data.packages).toEqual([]);
});
