import { expect, test } from "@playwright/test";
import { insertLegacyPackage } from "./db";
import { createPackage, uniqueName } from "./helpers";

test("مدة كاش باك بدون تاريخ تفعيل تُرفض مع بقاء القيم", async ({ page }) => {
  await page.goto("/packages/new");
  await page.getByLabel("اسم الباقة").fill(uniqueName("باقة خاطئة"));
  await page.getByLabel("تفعيل الخصم").fill("2026-05-10");
  await page.getByLabel("مدة الخصم").selectOption("6");
  await page.getByLabel("مدة الكاش باك").selectOption("12");
  await page.getByRole("button", { name: "إنشاء الباقة" }).click();
  await expect(page.getByText("حدد تاريخ تفعيل الكاش باك لحساب نهايته")).toBeVisible();
  await expect(page).toHaveURL("/packages/new");
  // التركيز ينتقل لأول حقل خاطئ فيظهر على الشاشة حتى في النموذج الطويل
  await expect(page.getByLabel("تفعيل الكاش باك")).toBeFocused();
  await expect(page.getByLabel("تفعيل الكاش باك")).toBeInViewport();
  await expect(page.getByLabel("تفعيل الخصم")).toHaveValue("2026-05-10");
  await expect(page.getByLabel("مدة الخصم")).toHaveValue("6");
  await expect(page.getByLabel("مدة الكاش باك")).toHaveValue("12");
  await expect(page.getByText("ينتهي في 10 نوفمبر 2026")).toBeVisible();

  // بعد إدخال التاريخ تُحفظ الباقة بالنهايتين المحسوبتين
  await page.getByLabel("تفعيل الكاش باك").fill("2026-06-01");
  await page.getByRole("button", { name: "إنشاء الباقة" }).click();
  await expect(page).toHaveURL(/\/packages\/\d+$/);
  const dates = page.getByTestId("package-dates");
  await expect(dates).toContainText("10 نوفمبر 2026");
  await expect(dates).toContainText("1 يونيو 2027");
});

test("المعاينة الحية تحسب تاريخ النهاية من التفعيل والمدة", async ({ page }) => {
  await page.goto("/packages/new");
  await expect(page.getByText(/^ينتهي في/)).toHaveCount(0);

  await page.getByLabel("مدة الخصم").selectOption("3");
  await expect(page.getByText("حدد تاريخ التفعيل لحساب تاريخ النهاية")).toBeVisible();
  // 31 يناير + 3 أشهر: أبريل 30 يوماً فقط
  await page.getByLabel("تفعيل الخصم").fill("2026-01-31");
  await expect(page.getByText("ينتهي في 30 أبريل 2026")).toBeVisible();
  await page.getByLabel("مدة الخصم").selectOption("6");
  await expect(page.getByText("ينتهي في 31 يوليو 2026")).toBeVisible();
  await page.getByLabel("مدة الخصم").selectOption("12");
  await expect(page.getByText("ينتهي في 31 يناير 2027")).toBeVisible();

  await page.getByLabel("تفعيل الكاش باك").fill("2026-02-15");
  await page.getByLabel("مدة الكاش باك").selectOption("6");
  await expect(page.getByText("ينتهي في 15 أغسطس 2026")).toBeVisible();
  await page.getByLabel("مدة الكاش باك").selectOption("");
  await expect(page.getByText("ينتهي في 15 أغسطس 2026")).toHaveCount(0);
});

test("الاسم مطلوب", async ({ page }) => {
  await page.goto("/packages/new");
  await page.getByLabel("تفعيل الخصم").fill("2026-05-10");
  await page.getByRole("button", { name: "إنشاء الباقة" }).click();
  await expect(page.getByText("هذا الحقل مطلوب")).toBeVisible();
});

test("إنشاء باقة يولّد خمس شرائح بالترتيب الصحيح", async ({ page }) => {
  const name = uniqueName("باقة العائلة");
  await createPackage(page, { name, discountStart: "2026-01-15", discountMonths: 6, cashbackStart: "2026-02-01", cashbackMonths: 3, notes: "ملاحظة تجريبية" });

  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText("ملاحظة تجريبية")).toBeVisible();
  const dates = page.getByTestId("package-dates");
  await expect(dates.getByText("15 يناير 2026", { exact: true })).toBeVisible();
  await expect(dates.getByText("15 يوليو 2026", { exact: true })).toBeVisible();
  await expect(dates.getByText("نهاية الخصم · 6 أشهر")).toBeVisible();
  await expect(dates.getByText("1 فبراير 2026", { exact: true })).toBeVisible();
  await expect(dates.getByText("1 مايو 2026", { exact: true })).toBeVisible();
  await expect(dates.getByText("نهاية الكاش باك · 3 أشهر")).toBeVisible();

  const expected = ["أساسي", "دولي", "دولي", "محلي", "محلي"];
  for (let slot = 1; slot <= 5; slot++) {
    const card = page.locator(`#line-${slot}`);
    await expect(card.getByRole("heading", { name: `الشريحة ${slot}` })).toBeVisible();
    await expect(card.getByText(expected[slot - 1], { exact: true })).toBeVisible();
  }
});

test("تعديل الباقة ثم حذفها", async ({ page }) => {
  const name = uniqueName("باقة للتعديل");
  const id = await createPackage(page, { name, discountStart: "2026-03-01" });

  await page.getByRole("link", { name: "تعديل" }).click();
  await expect(page).toHaveURL(`/packages/${id}/edit`);
  await page.getByLabel("اسم الباقة").fill(`${name} المعدّلة`);
  await expect(page.getByLabel("مدة الخصم")).toHaveValue("");
  await page.getByLabel("مدة الخصم").selectOption("6");
  await expect(page.getByText("ينتهي في 1 سبتمبر 2026")).toBeVisible();
  await page.getByRole("button", { name: "حفظ" }).click();
  await expect(page).toHaveURL(`/packages/${id}`);
  await expect(page.getByRole("heading", { level: 1, name: `${name} المعدّلة` })).toBeVisible();
  await expect(page.getByTestId("package-dates").getByText("1 سبتمبر 2026", { exact: true })).toBeVisible();

  // إعادة فتح التعديل: المدة تُستنتج من التاريخين، وتغييرها (أو تغيير التفعيل) يعيد حساب النهاية
  await page.getByRole("link", { name: "تعديل" }).click();
  await expect(page.getByLabel("مدة الخصم")).toHaveValue("6");
  await expect(page.getByText("ينتهي في 1 سبتمبر 2026")).toBeVisible();
  await page.getByLabel("تفعيل الخصم").fill("2026-03-10");
  await page.getByLabel("مدة الخصم").selectOption("12");
  await page.getByRole("button", { name: "حفظ" }).click();
  await expect(page).toHaveURL(`/packages/${id}`);
  await expect(page.getByTestId("package-dates").getByText("10 مارس 2027", { exact: true })).toBeVisible();
  await expect(page.getByTestId("package-dates").getByText("نهاية الخصم · سنة")).toBeVisible();

  await page.goto("/");
  await expect(page.getByTestId("package-list")).toContainText(`${name} المعدّلة`);

  await page.goto(`/packages/${id}`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "حذف الباقة" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByTestId("package-list").or(page.getByText("لا توجد باقات بعد"))).not.toContainText(`${name} المعدّلة`);

  const response = await page.goto(`/packages/${id}`);
  expect(response?.status()).toBe(404);
  await expect(page.getByText("الصفحة غير موجودة")).toBeVisible();
});

test("معرّف غير صالح يعطي 404", async ({ page }) => {
  const response = await page.goto("/packages/abc");
  expect(response?.status()).toBe(404);
});

test("تسجيل الأشخاص عند إنشاء الباقة وظهورهم تحتها في الرئيسية", async ({ page }) => {
  const name = uniqueName("باقة بأشخاص");
  await page.goto("/packages/new");
  await page.getByLabel("اسم الباقة").fill(name);
  await page.getByLabel("تفعيل الخصم").fill("2026-07-01");

  const p1 = page.getByTestId("person-1");
  await expect(p1).toContainText("أساسي");
  await p1.getByLabel("اسم المستخدم").fill("هادي");
  await p1.getByLabel("رقم الجوال").fill("0551112222");
  await p1.getByLabel("الرقم المرجعي للشريحة").fill("REF-A1");
  const p4 = page.getByTestId("person-4");
  await expect(p4).toContainText("محلي");
  await p4.getByLabel("اسم المستخدم").fill("سارة");
  await p4.getByLabel("دورة الفاتورة").selectOption("yearly");
  await page.getByRole("button", { name: "إنشاء الباقة" }).click();
  await expect(page).toHaveURL(/\/packages\/\d+$/);

  await expect(page.getByRole("heading", { name: "الأشخاص والشرائح" })).toBeVisible();
  const line1 = page.locator("#line-1");
  await expect(line1.getByLabel("اسم المستخدم")).toHaveValue("هادي");
  await expect(line1.getByLabel("رقم الجوال")).toHaveValue("0551112222");
  await expect(line1.getByLabel("الرقم المرجعي للشريحة")).toHaveValue("REF-A1");
  const line4 = page.locator("#line-4");
  await expect(line4.getByLabel("اسم المستخدم")).toHaveValue("سارة");
  await expect(line4.getByLabel("دورة الفاتورة")).toHaveValue("yearly");
  await expect(line4.getByRole("button", { name: /^2026:/ })).toBeVisible();
  await expect(page.locator("#line-2").getByLabel("اسم المستخدم")).toHaveValue("");

  await page.goto("/");
  const card = page.getByTestId("package-list").getByRole("listitem").filter({ hasText: name }).first();
  const people = card.getByTestId("package-people");
  await expect(people.getByRole("listitem")).toHaveCount(5);
  await expect(people.getByRole("listitem").nth(0)).toContainText("أساسي");
  await expect(people.getByRole("listitem").nth(0)).toContainText("هادي");
  await expect(people.getByRole("listitem").nth(0)).toContainText("0551112222");
  await expect(people.getByRole("listitem").nth(3)).toContainText("سارة");
  await expect(people.getByRole("listitem").nth(1)).toContainText("غير مسجل");
  await expect(card).toContainText("(2/5)");
});

test("خطأ في بيانات شخص لا يضيع باقي القيم المدخلة", async ({ page }) => {
  await page.goto("/packages/new");
  await page.getByLabel("اسم الباقة").fill(uniqueName("باقة خطأ"));
  await page.getByLabel("تفعيل الخصم").fill("2026-05-10");
  await page.getByLabel("مدة الكاش باك").selectOption("3");
  await page.getByTestId("person-2").getByLabel("اسم المستخدم").fill("محمد");
  await page.getByTestId("person-2").getByLabel("دورة الفاتورة").selectOption("yearly");
  await page.getByRole("button", { name: "إنشاء الباقة" }).click();
  await expect(page.getByText("حدد تاريخ تفعيل الكاش باك لحساب نهايته")).toBeVisible();
  await expect(page).toHaveURL("/packages/new");
  await expect(page.getByTestId("person-2").getByLabel("اسم المستخدم")).toHaveValue("محمد");
  await expect(page.getByTestId("person-2").getByLabel("دورة الفاتورة")).toHaveValue("yearly");
});

test("باقة قديمة بتاريخ نهاية يدوي: الإبقاء عليه ثم استبداله بمدة", async ({ page }) => {
  const name = uniqueName("باقة قديمة");
  const id = await insertLegacyPackage({ name, discountStart: "2026-01-10", discountEnd: "2026-09-25", cashbackEnd: "2026-12-31" });

  await page.goto(`/packages/${id}`);
  const dates = page.getByTestId("package-dates");
  await expect(dates.getByText("25 سبتمبر 2026", { exact: true })).toBeVisible();
  await expect(dates.getByText("31 ديسمبر 2026", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "تعديل" }).click();
  const discount = page.getByLabel("مدة الخصم");
  const cashback = page.getByLabel("مدة الكاش باك");
  await expect(discount).toHaveValue("keep");
  await expect(discount.locator("option[value=keep]")).toHaveText("الإبقاء على التاريخ الحالي (25 سبتمبر 2026)");
  await expect(cashback).toHaveValue("keep");
  await expect(page.getByText("ينتهي في 25 سبتمبر 2026")).toBeVisible();

  // حفظ تغيير الاسم فقط لا يمس التواريخ القديمة
  await page.getByLabel("اسم الباقة").fill(`${name} ٢`);
  await page.getByRole("button", { name: "حفظ" }).click();
  await expect(page).toHaveURL(`/packages/${id}`);
  await expect(dates.getByText("25 سبتمبر 2026", { exact: true })).toBeVisible();
  await expect(dates.getByText("31 ديسمبر 2026", { exact: true })).toBeVisible();

  // اختيار مدة يستبدل التاريخ القديم، وبعدها يختفي خيار الإبقاء
  await page.getByRole("link", { name: "تعديل" }).click();
  await page.getByLabel("مدة الخصم").selectOption("6");
  await page.getByRole("button", { name: "حفظ" }).click();
  await expect(page).toHaveURL(`/packages/${id}`);
  await expect(dates.getByText("10 يوليو 2026", { exact: true })).toBeVisible();
  await expect(dates.getByText("31 ديسمبر 2026", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "تعديل" }).click();
  await expect(page.getByLabel("مدة الخصم")).toHaveValue("6");
  await expect(page.getByLabel("مدة الخصم").locator("option[value=keep]")).toHaveCount(0);
  await expect(page.getByLabel("مدة الكاش باك")).toHaveValue("keep");
});
