import { expect, test } from "@playwright/test";
import { amountToInput, formatAmount, formatAmountNumber, parseAmount } from "../../src/lib/money";

test("parseAmount يحوّل النص إلى هللات", () => {
  expect(parseAmount("50")).toEqual({ ok: true, halalas: 5000 });
  expect(parseAmount("57.5")).toEqual({ ok: true, halalas: 5750 });
  expect(parseAmount("57.05")).toEqual({ ok: true, halalas: 5705 });
  expect(parseAmount(" 0 ")).toEqual({ ok: true, halalas: 0 });
  expect(parseAmount("1,250")).toEqual({ ok: true, halalas: 125000 });
  expect(parseAmount("1,250.50")).toEqual({ ok: true, halalas: 125050 });
  expect(parseAmount("57,5")).toEqual({ ok: true, halalas: 5750 });
  expect(parseAmount("1000000")).toEqual({ ok: true, halalas: 100_000_000 });
});

test("parseAmount يقبل الأرقام والفواصل العربية", () => {
  expect(parseAmount("٥٠")).toEqual({ ok: true, halalas: 5000 });
  expect(parseAmount("٥٧٫٥")).toEqual({ ok: true, halalas: 5750 });
  expect(parseAmount("١٬٢٥٠")).toEqual({ ok: true, halalas: 125000 });
  expect(parseAmount("۵۰")).toEqual({ ok: true, halalas: 5000 });
});

test("parseAmount: الفارغ بدون مبلغ، وغير الصالح مرفوض", () => {
  expect(parseAmount("")).toEqual({ ok: true, halalas: null });
  expect(parseAmount("   ")).toEqual({ ok: true, halalas: null });
  expect(parseAmount(null)).toEqual({ ok: true, halalas: null });
  for (const bad of ["abc", "-5", "12.345", "1.2.3", "1,2,3", "5 ريال", "1e3", ".5", "5.", "1000000.01", "99999999999", 50]) {
    expect(parseAmount(bad), String(bad)).toEqual({ ok: false });
  }
});

test("تنسيق المبالغ", () => {
  expect(formatAmountNumber(5000)).toBe("50");
  expect(formatAmountNumber(5750)).toBe("57.50");
  expect(formatAmountNumber(5)).toBe("0.05");
  expect(formatAmountNumber(0)).toBe("0");
  expect(formatAmountNumber(125050)).toBe("1,250.50");
  expect(formatAmountNumber(100_000_000)).toBe("1,000,000");
  expect(formatAmount(15000)).toBe("150 ر.س");
});

test("amountToInput يعيد قيمة قابلة للتحرير وتُقرأ بنفس المبلغ", () => {
  expect(amountToInput(null)).toBe("");
  expect(amountToInput(undefined)).toBe("");
  expect(amountToInput(5000)).toBe("50");
  expect(amountToInput(5750)).toBe("57.5");
  expect(amountToInput(5705)).toBe("57.05");
  expect(amountToInput(125050)).toBe("1250.5");
  for (const halalas of [0, 5, 50, 99, 100, 5750, 5705, 125050, 100_000_000]) {
    expect(parseAmount(amountToInput(halalas))).toEqual({ ok: true, halalas });
  }
});
