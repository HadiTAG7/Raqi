import { expect, test } from "@playwright/test";
import { dateStatus, daysBetween, formatIsoDate, isValidIsoDate, parseIsoDate, todayRiyadh } from "../../src/lib/dates";

test.describe("parseIsoDate", () => {
  test("يقبل التواريخ الصالحة", () => {
    expect(parseIsoDate("2026-09-20")).toEqual({ year: 2026, month: 9, day: 20 });
    expect(parseIsoDate("2024-02-29")).toEqual({ year: 2024, month: 2, day: 29 });
  });

  test("يرفض التواريخ غير الصالحة", () => {
    for (const bad of ["2026-02-30", "2026-13-01", "2025-02-29", "2026-9-1", "20260920", "", null, undefined, 42]) {
      expect(parseIsoDate(bad), String(bad)).toBeNull();
      expect(isValidIsoDate(bad), String(bad)).toBe(false);
    }
  });
});

test("daysBetween يحسب عبر حدود السنة", () => {
  expect(daysBetween("2026-09-20", "2026-09-20")).toBe(0);
  expect(daysBetween("2026-09-20", "2026-09-30")).toBe(10);
  expect(daysBetween("2025-12-25", "2026-01-05")).toBe(11);
  expect(daysBetween("2026-09-20", "2026-08-01")).toBe(-50);
});

test("formatIsoDate يعرض أرقاماً لاتينية وأشهراً عربية", () => {
  expect(formatIsoDate("2026-09-20")).toBe("20 سبتمبر 2026");
  expect(formatIsoDate("2026-01-05")).toBe("5 يناير 2026");
  expect(formatIsoDate(null)).toBe("غير محدد");
  expect(formatIsoDate("bad", "—")).toBe("—");
});

test("dateStatus يطبّق حد الثلاثين يوماً", () => {
  const today = "2026-09-20";
  expect(dateStatus(null, today)).toBe("unset");
  expect(dateStatus("2026-09-19", today)).toBe("ended");
  expect(dateStatus("2026-09-20", today)).toBe("ending_soon");
  expect(dateStatus("2026-10-20", today)).toBe("ending_soon");
  expect(dateStatus("2026-10-21", today)).toBe("active");
});

test("todayRiyadh يحترم RAQI_TODAY خارج Vercel ويحسب بتوقيت الرياض", () => {
  const prevToday = process.env.RAQI_TODAY;
  const prevVercel = process.env.VERCEL;
  try {
    delete process.env.VERCEL;
    process.env.RAQI_TODAY = "2026-09-20";
    expect(todayRiyadh()).toBe("2026-09-20");

    delete process.env.RAQI_TODAY;
    // 22:30 UTC = 01:30 في الرياض في اليوم التالي
    expect(todayRiyadh(new Date("2026-03-01T22:30:00Z"))).toBe("2026-03-02");
    expect(todayRiyadh(new Date("2026-03-01T20:30:00Z"))).toBe("2026-03-01");

    process.env.RAQI_TODAY = "2026-09-20";
    process.env.VERCEL = "1";
    expect(todayRiyadh(new Date("2026-03-01T22:30:00Z"))).toBe("2026-03-02");
  } finally {
    if (prevToday === undefined) delete process.env.RAQI_TODAY;
    else process.env.RAQI_TODAY = prevToday;
    if (prevVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prevVercel;
  }
});
