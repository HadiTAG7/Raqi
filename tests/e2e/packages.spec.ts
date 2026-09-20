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
