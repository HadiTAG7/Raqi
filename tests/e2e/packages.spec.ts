import { expect, test } from "@playwright/test";
import { createPackage, uniqueName } from "./helpers";

test("رفض تاريخ نهاية قبل تاريخ التفعيل", async ({ page }) => {
  await page.goto("/packages/new");
  await page.getByLabel("اسم الباقة").fill(uniqueName("باقة خاطئة"));
  await page.getByLabel("تفعيل الخصم").fill("2026-05-10");
  await page.getByLabel("نهاية الخصم").fill("2026-05-01");
  await page.getByRole("button", { name: "إنشاء الباقة" }).click();
  await expect(page.getByText("يجب أن يكون التاريخ بعد تاريخ تفعيل الخصم")).toBeVisible();
  await expect(page).toHaveURL("/packages/new");
});

test("الاسم مطلوب", async ({ page }) => {
  await page.goto("/packages/new");
  await page.getByLabel("تفعيل الخصم").fill("2026-05-10");
  await page.getByRole("button", { name: "إنشاء الباقة" }).click();
  await expect(page.getByText("هذا الحقل مطلوب")).toBeVisible();
});

test("إنشاء باقة يولّد خمس شرائح بالترتيب الصحيح", async ({ page }) => {
  const name = uniqueName("باقة العائلة");
  await createPackage(page, { name, discountStart: "2026-01-15", discountEnd: "2027-01-14", cashbackEnd: "2026-12-31", notes: "ملاحظة تجريبية" });

  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText("ملاحظة تجريبية")).toBeVisible();
  await expect(page.getByText("15 يناير 2026", { exact: true })).toBeVisible();

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
  await page.getByLabel("نهاية الخصم").fill("2026-10-01");
  await page.getByRole("button", { name: "حفظ" }).click();
  await expect(page).toHaveURL(`/packages/${id}`);
  await expect(page.getByRole("heading", { level: 1, name: `${name} المعدّلة` })).toBeVisible();
  await expect(page.getByText("1 أكتوبر 2026")).toBeVisible();

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
  await page.getByLabel("نهاية الخصم").fill("2026-05-01");
  await page.getByTestId("person-2").getByLabel("اسم المستخدم").fill("محمد");
  await page.getByTestId("person-2").getByLabel("دورة الفاتورة").selectOption("yearly");
  await page.getByRole("button", { name: "إنشاء الباقة" }).click();
  await expect(page.getByText("يجب أن يكون التاريخ بعد تاريخ تفعيل الخصم")).toBeVisible();
  await expect(page).toHaveURL("/packages/new");
  await expect(page.getByTestId("person-2").getByLabel("اسم المستخدم")).toHaveValue("محمد");
  await expect(page.getByTestId("person-2").getByLabel("دورة الفاتورة")).toHaveValue("yearly");
});
