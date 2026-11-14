import { expect, test } from "@playwright/test";
import { uniqueName } from "./helpers";

// اليوم المثبّت في الاختبارات: 20 سبتمبر 2026

test("فواتير الباقة: تسجيل المبالغ والدفع للشركة والمقارنة مع الأشخاص", async ({ page }) => {
  const name = uniqueName("باقة الفواتير");
  await page.goto("/packages/new");
  await page.getByLabel("اسم الباقة").fill(name);
  await page.getByLabel("تفعيل الخصم").fill("2026-07-01");
  await expect(page.getByLabel("دورة فاتورة الباقة")).toHaveValue("monthly");
  await page.getByTestId("person-1").getByLabel("مبلغ الفاتورة").fill("100");
  await page.getByTestId("person-2").getByLabel("مبلغ الفاتورة").fill("50");
  await page.getByTestId("person-3").getByLabel("دورة الفاتورة").selectOption("free");
  await page.getByRole("button", { name: "إنشاء الباقة" }).click();
  await expect(page).toHaveURL(/\/packages\/\d+$/);
  const id = Number(/\/packages\/(\d+)$/.exec(page.url())![1]);

  const section = page.getByTestId("package-invoices");
  const rows = section.getByTestId("bill-row");
  // يوليو وأغسطس وسبتمبر، الأحدث أولاً
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("سبتمبر 2026");
  await expect(rows.nth(2)).toContainText("يوليو 2026");
  await expect(section.getByTestId("bill-missing")).toContainText("3 فواتير بدون مبلغ");
  await expect(section.getByText("سجّل مبالغ فواتير الباقة ومبالغ الأشخاص لتظهر المقارنة.")).toBeVisible();

  const amount = (period: string) => section.getByLabel(`مبلغ فاتورة ${period}`);
  // الحفظ بالخروج من الخانة أو بـ Enter
  await amount("يوليو 2026").fill("300");
  await amount("أغسطس 2026").click();
  await expect(section.getByTestId("bill-recorded")).toHaveText("300 ر.س");
  await amount("أغسطس 2026").fill("٣٠٠");
  await amount("أغسطس 2026").press("Enter");
  await amount("سبتمبر 2026").fill("310.5");
  await amount("سبتمبر 2026").press("Enter");
  await expect(section.getByTestId("bill-recorded")).toHaveText("910.50 ر.س");
  await expect(section.getByTestId("bill-owed")).toHaveText("910.50 ر.س");
  await expect(section.getByTestId("bill-paid")).toHaveText("0 ر.س");
  await expect(section.getByTestId("bill-missing")).toHaveCount(0);

  // الدفع للشركة
  const july = section.getByRole("button", { name: /^يوليو 2026:/ });
  await july.click();
  await expect(july).toHaveAttribute("aria-pressed", "true");
  await expect(section.getByTestId("bill-paid")).toHaveText("300 ر.س");
  await expect(section.getByTestId("bill-owed")).toHaveText("610.50 ر.س");

  // المقارنة: الأشخاص 3 × 100 + 3 × 50 = 450، والمجاني خارج الحساب، وفواتير الباقة 910.50
  await expect(section.getByTestId("people-expected")).toHaveText("450 ر.س");
  await expect(section.getByTestId("people-collected")).toHaveText("0 ر.س");
  await expect(section.getByTestId("bill-difference")).toHaveText("الفرق: تتحمّل أنت 460.50 ر.س");
  await page.locator("#line-1").getByRole("button", { name: /^سبتمبر 2026/ }).click();
  await expect(section.getByTestId("people-collected")).toHaveText("100 ر.س");

  // مبلغ غير صالح: خطأ ولا يُحفظ
  await amount("سبتمبر 2026").fill("abc");
  await amount("سبتمبر 2026").press("Enter");
  await expect(amount("سبتمبر 2026")).toHaveAttribute("aria-invalid", "true");
  await expect(section.getByRole("alert")).toHaveText("مبلغ غير صالح (مثال: 50 أو 57.50)");
  await expect(section.getByTestId("bill-recorded")).toHaveText("910.50 ر.س");

  // بعد إعادة التحميل: القيم محفوظة
  await page.reload();
  await expect(amount("سبتمبر 2026")).toHaveValue("310.5");
  await expect(amount("أغسطس 2026")).toHaveValue("300");
  await expect(section.getByRole("button", { name: /^يوليو 2026:/ })).toHaveAttribute("aria-pressed", "true");
  await expect(section.getByTestId("bill-owed")).toHaveText("610.50 ر.س");

  // مسح مبلغ يعيد الفاتورة "بدون مبلغ"
  await amount("أغسطس 2026").fill("");
  await amount("أغسطس 2026").press("Enter");
  await expect(section.getByTestId("bill-missing")).toContainText("فاتورة واحدة بدون مبلغ");
  await expect(section.getByTestId("bill-owed")).toHaveText("310.50 ر.س");

  // الرئيسية: المتبقي للشركة على بطاقة الباقة وفي البطاقة الملخّصة
  await page.goto("/");
  const card = page.getByTestId("package-list").getByRole("listitem").filter({ hasText: name }).first();
  await expect(card.getByTestId("package-company-owed")).toHaveText("310.50 ر.س");
  const owedTile = page.getByTestId("tile").filter({ hasText: "المتبقي للشركة" });
  // نص البطاقة مثل "310.50ر.س": نأخذ الرقم الأول فقط (نقطة "ر.س" ليست جزءاً منه)
  const tileText = (await owedTile.getByTestId("tile-value").textContent()) ?? "";
  const tileValue = Number(/[\d,]+(?:\.\d+)?/.exec(tileText)?.[0].replace(/,/g, ""));
  expect(tileValue).toBeGreaterThanOrEqual(310.5);

  // تغيير الدورة إلى سنوية: فاتورة واحدة لسنة 2026
  await page.goto(`/packages/${id}/edit`);
  await page.getByLabel("دورة فاتورة الباقة").selectOption("yearly");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/packages/${id}$`));
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0)).toContainText("2026");
  await expect(amount("2026")).toHaveValue("");
  await expect(section.getByTestId("bill-recorded")).toHaveText("0 ر.س");
  await page.goto(`/packages/${id}/edit`);
  await expect(page.getByLabel("دورة فاتورة الباقة")).toHaveValue("yearly");
});
