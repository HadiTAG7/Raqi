import { expect, test } from "@playwright/test";
import { packageFormInitial, parsePackageForm } from "../../src/lib/validation";

const base = { name: "باقة", notes: "", discountStart: "2026-01-15", discountDuration: "", cashbackStart: "", cashbackDuration: "" };

test("بدون مدد: لا تواريخ نهاية", () => {
  expect(parsePackageForm(base)).toEqual({
    ok: true,
    data: { name: "باقة", notes: null, discountStart: "2026-01-15", discountEnd: null, cashbackStart: null, cashbackEnd: null, billCycle: "monthly" },
  });
});

test("دورة فاتورة الباقة: شهرية افتراضياً، وسنوية عند اختيارها، وغيرها مرفوض", () => {
  expect(parsePackageForm({ ...base, billCycle: "" })).toMatchObject({ ok: true, data: { billCycle: "monthly" } });
  expect(parsePackageForm({ ...base, billCycle: "yearly" })).toMatchObject({ ok: true, data: { billCycle: "yearly" } });
  const bad = parsePackageForm({ ...base, billCycle: "free" });
  expect(bad.ok).toBe(false);
  if (!bad.ok) expect(Object.keys(bad.fieldErrors)).toEqual(["billCycle"]);
});

test("النهاية تُحسب من التفعيل + المدة لكل من الخصم والكاش باك", () => {
  const result = parsePackageForm({ ...base, discountDuration: "6", cashbackStart: "2026-02-01", cashbackDuration: "12" });
  expect(result).toMatchObject({
    ok: true,
    data: { discountEnd: "2026-07-15", cashbackStart: "2026-02-01", cashbackEnd: "2027-02-01" },
  });
  expect(parsePackageForm({ ...base, discountDuration: "3" })).toMatchObject({ ok: true, data: { discountEnd: "2026-04-15" } });
  expect(parsePackageForm({ ...base, discountDuration: "12" })).toMatchObject({ ok: true, data: { discountEnd: "2027-01-15" } });
});

test("تاريخ تفعيل الكاش باك يُحفظ حتى بدون مدة", () => {
  expect(parsePackageForm({ ...base, cashbackStart: "2026-03-01" })).toMatchObject({
    ok: true,
    data: { cashbackStart: "2026-03-01", cashbackEnd: null },
  });
});

test("مدة كاش باك بدون تاريخ تفعيل خطأ على حقل التاريخ", () => {
  const result = parsePackageForm({ ...base, cashbackDuration: "6" });
  expect(result.ok).toBe(false);
  if (!result.ok) expect(Object.keys(result.fieldErrors)).toEqual(["cashbackStart"]);
});

test("قيم غير صالحة تُرفض", () => {
  for (const bad of [{ discountDuration: "9" }, { cashbackDuration: "abc" }, { discountStart: "" }, { discountStart: "2026-02-30" }, { cashbackStart: "2026-13-01" }, { name: " " }]) {
    expect(parsePackageForm({ ...base, ...bad }).ok, JSON.stringify(bad)).toBe(false);
  }
});

test("keep: يُبقي التاريخ المخزّن في التعديل فقط", () => {
  const existing = { discountEnd: "2026-09-25", cashbackEnd: "2026-12-31" };
  expect(parsePackageForm({ ...base, discountDuration: "keep", cashbackDuration: "keep" }, existing)).toMatchObject({
    ok: true,
    data: { discountEnd: "2026-09-25", cashbackStart: null, cashbackEnd: "2026-12-31" },
  });
  // عند الإنشاء (لا يوجد تاريخ مخزّن) أو إذا لم يكن للباقة تاريخ نهاية
  expect(parsePackageForm({ ...base, discountDuration: "keep" }).ok).toBe(false);
  expect(parsePackageForm({ ...base, cashbackDuration: "keep" }, { discountEnd: "2026-09-25", cashbackEnd: null }).ok).toBe(false);
  // التاريخ المخزّن صار أقدم من تاريخ التفعيل الجديد
  const moved = parsePackageForm({ ...base, discountStart: "2026-10-01", discountDuration: "keep" }, existing);
  expect(moved.ok).toBe(false);
  if (!moved.ok) expect(Object.keys(moved.fieldErrors)).toEqual(["discountDuration"]);
  const cashbackMoved = parsePackageForm({ ...base, cashbackStart: "2027-01-01", cashbackDuration: "keep" }, existing);
  expect(cashbackMoved.ok).toBe(false);
});

test("packageFormInitial يستنتج المدة ويعلّم التواريخ اليدوية بـ keep", () => {
  const pkg = { name: "أ", notes: null, discountStart: "2026-01-15", discountEnd: "2026-07-15", cashbackStart: "2026-02-01", cashbackEnd: "2026-05-01", billCycle: "yearly" };
  expect(packageFormInitial(pkg)).toEqual({ name: "أ", notes: "", discountStart: "2026-01-15", discountDuration: "6", cashbackStart: "2026-02-01", cashbackDuration: "3", billCycle: "yearly" });
  expect(packageFormInitial({ ...pkg, discountEnd: null, cashbackStart: null, cashbackEnd: null })).toMatchObject({ discountDuration: "", cashbackStart: "", cashbackDuration: "" });
  // باقة قديمة: نهاية يدوية، وكاش باك بلا تاريخ تفعيل
  expect(packageFormInitial({ ...pkg, discountEnd: "2027-01-14", cashbackStart: null, cashbackEnd: "2026-12-31" })).toMatchObject({ discountDuration: "keep", cashbackDuration: "keep" });
});
