import { expect, test } from "@playwright/test";
import { formatPeriod, isValidPeriod, periodForDate, periodsBetween } from "../../src/lib/periods";

test("periodsBetween الشهري يعبر حدود السنة", () => {
  expect(periodsBetween("2025-11-15", "2026-02-03", "monthly")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  expect(periodsBetween("2026-09-01", "2026-09-30", "monthly")).toEqual(["2026-09"]);
});

test("periodsBetween السنوي", () => {
  expect(periodsBetween("2024-06-01", "2026-09-20", "yearly")).toEqual(["2024", "2025", "2026"]);
});

test("periodsBetween يعيد فارغاً عندما تكون البداية بعد النهاية", () => {
  expect(periodsBetween("2026-10-01", "2026-09-20", "monthly")).toEqual([]);
  expect(periodsBetween("2027-01-01", "2026-09-20", "yearly")).toEqual([]);
});

test("periodForDate", () => {
  expect(periodForDate("2026-09-20", "monthly")).toBe("2026-09");
  expect(periodForDate("2026-09-20", "yearly")).toBe("2026");
});

test("isValidPeriod", () => {
  expect(isValidPeriod("2026-09", "monthly")).toBe(true);
  expect(isValidPeriod("2026-13", "monthly")).toBe(false);
  expect(isValidPeriod("2026", "monthly")).toBe(false);
  expect(isValidPeriod("2026", "yearly")).toBe(true);
  expect(isValidPeriod("2026-09", "yearly")).toBe(false);
  expect(isValidPeriod(null, "monthly")).toBe(false);
});

test("formatPeriod", () => {
  expect(formatPeriod("2026-09", "monthly")).toBe("سبتمبر 2026");
  expect(formatPeriod("2026", "yearly")).toBe("2026");
});
