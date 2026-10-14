import { expect, test } from "@playwright/test";
import { createPackage, uniqueName } from "./helpers";

test("تعديل بيانات شريحة وحفظها", async ({ page }) => {
  const id = await createPackage(page, { name: uniqueName("باقة الشرائح"), discountStart: "2026-07-01" });
  const card = page.locator("#line-1");

  await card.getByLabel("اسم المستخدم").fill("هادي");
  await card.getByLabel("رقم الجوال").fill("0551234567");
  await card.getByLabel("الرقم المرجعي للشريحة").fill("REF-0001");
  await card.getByLabel("ملاحظات").fill("الشريحة الرئيسية");
  await card.getByRole("button", { name: "حفظ الشريحة" }).click();
  await expect(card.getByRole("status")).toHaveText("تم الحفظ");

  await page.reload();
  await expect(page).toHaveURL(`/packages/${id}`);
  await expect(card.getByLabel("اسم المستخدم")).toHaveValue("هادي");
  await expect(card.getByLabel("رقم الجوال")).toHaveValue("0551234567");
  await expect(card.getByLabel("الرقم المرجعي للشريحة")).toHaveValue("REF-0001");
  await expect(card.getByText("0551234567")).toBeVisible();
});

test("تغيير الدورة إلى سنوية يعرض فترات سنوية", async ({ page }) => {
  await createPackage(page, { name: uniqueName("باقة سنوية"), discountStart: "2025-04-01" });
  const card = page.locator("#line-2");

  await expect(card.getByRole("button", { name: /^سبتمبر 2026/ })).toBeVisible();
  await expect(card.getByRole("button", { name: /^عرض الكل/ })).toBeVisible();

  await card.getByLabel("دورة الفاتورة").selectOption("yearly");
  await card.getByRole("button", { name: "حفظ الشريحة" }).click();
  await expect(card.getByRole("status")).toHaveText("تم الحفظ");
  // بعد الحفظ يبقى الحقل "سنوية"، وحفظ ثانٍ لتعديل آخر لا يعيدها "شهرية"
  await expect(card.getByLabel("دورة الفاتورة")).toHaveValue("yearly");
  await card.getByLabel("اسم المستخدم").fill("س");
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    card.getByRole("button", { name: "حفظ الشريحة" }).click(),
  ]);
  await page.reload();
  await expect(page.locator("#line-2").getByLabel("دورة الفاتورة")).toHaveValue("yearly");

  await expect(card.getByRole("button", { name: /^2026:/ })).toBeVisible();
  await expect(card.getByRole("button", { name: /^2025:/ })).toBeVisible();
  await expect(card.getByRole("button", { name: /^سبتمبر 2026/ })).toHaveCount(0);
});

test("بداية فوترة مستقبلية تعرض رسالة بدل الشبكة", async ({ page }) => {
  await createPackage(page, { name: uniqueName("باقة مستقبلية"), discountStart: "2026-09-01" });
  const card = page.locator("#line-3");
  await card.getByLabel("بداية الفوترة").fill("2026-11-01");
  await card.getByRole("button", { name: "حفظ الشريحة" }).click();
  await expect(card.getByRole("status")).toHaveText("تم الحفظ");
  await expect(card.getByText("تبدأ الفوترة في 1 نوفمبر 2026")).toBeVisible();
});
