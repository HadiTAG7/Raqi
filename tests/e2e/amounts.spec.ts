import { expect, test } from "@playwright/test";
import { createPackage, uniqueName } from "./helpers";

// اليوم المثبّت في الاختبارات: 20 سبتمبر 2026

test("شخص مجاني وأشخاص بمبالغ: المستحق يُحسب ويظهر في الباقة والرئيسية", async ({ page }) => {
  const name = uniqueName("باقة المبالغ");
  await page.goto("/packages/new");
  await page.getByLabel("اسم الباقة").fill(name);
  await page.getByLabel("تفعيل الخصم").fill("2026-07-01");

  const p1 = page.getByTestId("person-1");
  await p1.getByLabel("اسم المستخدم").fill("هادي");
  await p1.getByLabel("مبلغ الفاتورة").fill("50");

  const p2 = page.getByTestId("person-2");
  await p2.getByLabel("اسم المستخدم").fill("ضيف");
  await p2.getByLabel("مبلغ الفاتورة").fill("99");
  await p2.getByLabel("دورة الفاتورة").selectOption("free");
  await expect(p2.getByLabel("مبلغ الفاتورة")).toBeDisabled();
  await expect(p2.getByText("الشريحة المجانية لا مبلغ عليها")).toBeVisible();
  await expect(p1.getByLabel("مبلغ الفاتورة")).toBeEnabled();

  // أرقام عربية بفاصلة عشرية عربية
  await page.getByTestId("person-3").getByLabel("مبلغ الفاتورة").fill("٥٧٫٥");

  await page.getByRole("button", { name: "إنشاء الباقة" }).click();
  await expect(page).toHaveURL(/\/packages\/\d+$/);
  const id = Number(/\/packages\/(\d+)$/.exec(page.url())![1]);

  // الشريحة 1: يوليو وأغسطس وسبتمبر × 50 = 150
  const line1 = page.locator("#line-1");
  await expect(line1.getByLabel("مبلغ الفاتورة")).toHaveValue("50");
  await expect(line1.getByText("50 ر.س للفاتورة")).toBeVisible();
  await expect(line1.getByTestId("line-due")).toHaveText("· المستحق 150 ر.س");
  await line1.getByRole("button", { name: /^سبتمبر 2026/ }).click();
  await expect(line1.getByTestId("line-due")).toHaveText("· المستحق 100 ر.س");

  // الشريحة 2 مجانية: بلا شبكة فواتير وبلا مبلغ
  const line2 = page.locator("#line-2");
  await expect(line2.getByText("مجانية", { exact: true }).first()).toBeVisible();
  await expect(line2.getByTestId("free-note")).toHaveText("شريحة مجانية: لا فواتير عليها.");
  await expect(line2.getByRole("button", { name: /2026:/ })).toHaveCount(0);
  await expect(line2.getByLabel("دورة الفاتورة")).toHaveValue("free");
  await expect(line2.getByLabel("مبلغ الفاتورة")).toBeDisabled();
  await expect(line2.getByLabel("مبلغ الفاتورة")).toHaveValue("");

  // الشريحة 3: 3 × 57.50 = 172.50
  const line3 = page.locator("#line-3");
  await expect(line3.getByLabel("مبلغ الفاتورة")).toHaveValue("57.5");
  await expect(line3.getByTestId("line-due")).toHaveText("· المستحق 172.50 ر.س");

  // الشريحة 4 بلا مبلغ: لا يُعرض مستحق
  await expect(page.locator("#line-4").getByTestId("line-due")).toHaveCount(0);

  await page.goto("/");
  const card = page.getByTestId("package-list").getByRole("listitem").filter({ hasText: name }).first();
  const people = card.getByTestId("package-people").getByRole("listitem");
  await expect(people.nth(0)).toContainText("هادي");
  await expect(people.nth(0)).toContainText("100 ر.س");
  await expect(people.nth(1)).toContainText("ضيف");
  await expect(people.nth(1)).toContainText("مجانية");
  await expect(people.nth(2)).toContainText("172.50 ر.س");
  await expect(card.getByTestId("package-due")).toHaveText("المستحق 272.50 ر.س");

  // قائمة غير المدفوع: الشريحة 1 مدفوعة لسبتمبر، والمجانية خارج القائمة
  const group = page.getByTestId("unpaid-group").filter({ hasText: name });
  const unpaidLines = group.getByTestId("unpaid-line");
  await expect(unpaidLines).toHaveCount(3);
  await expect(unpaidLines.filter({ hasText: "الشريحة 1" })).toHaveCount(0);
  await expect(unpaidLines.filter({ hasText: "الشريحة 2" })).toHaveCount(0);
  await expect(unpaidLines.filter({ hasText: "الشريحة 3" })).toContainText("المستحق 172.50 ر.س");

  const tiles = page.getByTestId("tile");
  await expect(tiles).toHaveCount(5);
  await expect(tiles.nth(4)).toContainText("إجمالي المستحق");
  await expect(tiles.nth(4)).toContainText("ر.س");
  // نص البطاقة مثل "272.50ر.س": نأخذ الرقم الأول فقط (نقطة "ر.س" ليست جزءاً منه)
  const totalText = (await tiles.nth(4).getByTestId("tile-value").textContent()) ?? "";
  const total = Number(/[\d,]+(?:\.\d+)?/.exec(totalText)?.[0].replace(/,/g, ""));
  expect(total).toBeGreaterThanOrEqual(272.5);

  // التصدير يحمل المبلغ بالهللات والدورة المجانية
  const body = (await (await page.request.get("/api/export")).json()) as { packages: Array<{ id: number; lines: Array<{ billingCycle: string; amountHalalas: number | null }> }> };
  const exported = body.packages.find((p) => p.id === id)!;
  expect(exported.lines.map((l) => [l.billingCycle, l.amountHalalas])).toEqual([
    ["monthly", 5000],
    ["free", null],
    ["monthly", 5750],
    ["monthly", null],
    ["monthly", null],
  ]);
});

test("التحويل إلى مجانية يخفي الفواتير، والرجوع يعيد الدفعات السابقة", async ({ page }) => {
  await createPackage(page, { name: uniqueName("باقة التحويل"), discountStart: "2026-08-01" });
  const card = page.locator("#line-1");

  await card.getByLabel("مبلغ الفاتورة").fill("30");
  await card.getByRole("button", { name: "حفظ الشريحة" }).click();
  await expect(card.getByRole("status")).toHaveText("تم الحفظ");
  await expect(card.getByTestId("line-due")).toHaveText("· المستحق 60 ر.س");
  await card.getByRole("button", { name: /^أغسطس 2026/ }).click();
  await expect(card.getByTestId("line-due")).toHaveText("· المستحق 30 ر.س");

  // اختيار "مجانية" يعطّل المبلغ فوراً، وبعد الحفظ تختفي الشبكة
  await card.getByLabel("دورة الفاتورة").selectOption("free");
  await expect(card.getByLabel("مبلغ الفاتورة")).toBeDisabled();
  await card.getByRole("button", { name: "حفظ الشريحة" }).click();
  await expect(card.getByTestId("free-note")).toBeVisible();
  await expect(card.getByRole("button", { name: /2026:/ })).toHaveCount(0);
  await expect(card.getByTestId("line-due")).toHaveCount(0);

  await page.reload();
  await expect(card.getByLabel("دورة الفاتورة")).toHaveValue("free");
  await expect(card.getByLabel("مبلغ الفاتورة")).toHaveValue("");
  await expect(card.getByTestId("free-note")).toBeVisible();

  // الرجوع لشهرية: دفعة أغسطس ما زالت محفوظة
  await card.getByLabel("دورة الفاتورة").selectOption("monthly");
  await expect(card.getByLabel("مبلغ الفاتورة")).toBeEnabled();
  await card.getByLabel("مبلغ الفاتورة").fill("30");
  await card.getByRole("button", { name: "حفظ الشريحة" }).click();
  await expect(card.getByRole("button", { name: /^أغسطس 2026/ })).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByRole("button", { name: /^سبتمبر 2026/ })).toHaveAttribute("aria-pressed", "false");
  await expect(card.getByTestId("line-due")).toHaveText("· المستحق 30 ر.س");
  await expect(card.getByTestId("free-note")).toHaveCount(0);
});

test("مبلغ غير صالح يُرفض مع بقاء القيم", async ({ page }) => {
  await createPackage(page, { name: uniqueName("باقة مبلغ خاطئ"), discountStart: "2026-08-01" });
  const card = page.locator("#line-1");
  await card.getByLabel("اسم المستخدم").fill("خالد");
  await card.getByLabel("مبلغ الفاتورة").fill("abc");
  await card.getByRole("button", { name: "حفظ الشريحة" }).click();
  await expect(card.getByText("مبلغ غير صالح (مثال: 50 أو 57.50)")).toBeVisible();
  await expect(card.getByLabel("اسم المستخدم")).toHaveValue("خالد");
  await expect(card.getByLabel("مبلغ الفاتورة")).toHaveValue("abc");
  await expect(card.getByLabel("مبلغ الفاتورة")).toHaveAttribute("aria-invalid", "true");

  // في نموذج الباقة الجديدة: الخطأ على حقل الشخص والتركيز ينتقل إليه
  await page.goto("/packages/new");
  await page.getByLabel("اسم الباقة").fill(uniqueName("باقة"));
  await page.getByLabel("تفعيل الخصم").fill("2026-08-01");
  const p4 = page.getByTestId("person-4");
  await p4.getByLabel("مبلغ الفاتورة").fill("12.345");
  await page.getByRole("button", { name: "إنشاء الباقة" }).click();
  await expect(p4.getByText("مبلغ غير صالح (مثال: 50 أو 57.50)")).toBeVisible();
  await expect(page).toHaveURL("/packages/new");
  await expect(p4.getByLabel("مبلغ الفاتورة")).toBeFocused();
  await expect(p4.getByLabel("مبلغ الفاتورة")).toHaveValue("12.345");
});
