import { expect, test } from "@playwright/test";
import { lineInputSchema, personRowSchema } from "../../src/lib/validation";

const base = { holderName: "هادي", phoneNumber: "", simReference: "", billingCycle: "monthly", amount: "", billingStart: "", notes: "" };

test("الشريحة: المبلغ اختياري ويُحوَّل إلى هللات", () => {
  expect(lineInputSchema.parse(base)).toMatchObject({ billingCycle: "monthly", amount: null });
  expect(lineInputSchema.parse({ ...base, amount: "50" })).toMatchObject({ amount: 5000 });
  expect(lineInputSchema.parse({ ...base, billingCycle: "yearly", amount: "٥٧٫٥" })).toMatchObject({ billingCycle: "yearly", amount: 5750 });
});

test("الشريحة المجانية تُحفظ بلا مبلغ مهما أُرسل", () => {
  expect(lineInputSchema.parse({ ...base, billingCycle: "free", amount: "50" })).toMatchObject({ billingCycle: "free", amount: null });
  expect(lineInputSchema.parse({ ...base, billingCycle: "free" })).toMatchObject({ billingCycle: "free", amount: null });
});

test("الشريحة: مبلغ أو دورة غير صالحة تُرفض", () => {
  expect(lineInputSchema.safeParse({ ...base, amount: "abc" }).success).toBe(false);
  expect(lineInputSchema.safeParse({ ...base, amount: "-1" }).success).toBe(false);
  expect(lineInputSchema.safeParse({ ...base, billingCycle: "weekly" }).success).toBe(false);
});

test("صف الشخص عند إنشاء الباقة: الدورة الافتراضية شهرية، ويدعم المجانية والمبلغ", () => {
  const row = { holderName: "", phoneNumber: "", simReference: "", billingCycle: "", amount: "" };
  expect(personRowSchema.parse(row)).toEqual({ holderName: null, phoneNumber: null, simReference: null, billingCycle: "monthly", amount: null });
  expect(personRowSchema.parse({ ...row, billingCycle: "free", amount: "20" })).toMatchObject({ billingCycle: "free", amount: null });
  expect(personRowSchema.parse({ ...row, amount: "1,250.50" })).toMatchObject({ amount: 125050 });
  expect(personRowSchema.safeParse({ ...row, amount: "12.345" }).success).toBe(false);
});
