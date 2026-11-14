import { expect, test } from "@playwright/test";
import { createPackage, uniqueName } from "./helpers";

test("الرئيسية تعرض حالات التواريخ والملخص", async ({ page }) => {
  const soon = uniqueName("باقة تنتهي قريباً");
  const ended = uniqueName("باقة منتهية");
  const active = uniqueName("باقة نشطة");
  // اليوم المثبّت في الاختبارات: 20 سبتمبر 2026
  // 30 مارس + 6 أشهر = 30 سبتمبر (بعد 10 أيام)، و20 أبريل + 6 أشهر = 20 أكتوبر (بعد 30 يوماً)
  await createPackage(page, { name: soon, discountStart: "2026-03-30", discountMonths: 6, cashbackStart: "2026-04-20", cashbackMonths: 6 });
  // 1 يناير 2025 + سنة = 1 يناير 2026، و1 فبراير + 6 أشهر = 1 أغسطس (قبل 50 يوماً)
  await createPackage(page, { name: ended, discountStart: "2025-01-01", discountMonths: 12, cashbackStart: "2026-02-01", cashbackMonths: 6 });
  await createPackage(page, { name: active, discountStart: "2026-09-20", discountMonths: 12 });

  await page.goto("/");
  await expect(page.getByText("اليوم: 20 سبتمبر 2026")).toBeVisible();

  const tiles = page.getByTestId("tile");
  await expect(tiles).toHaveCount(5);
  const packagesCount = Number(await tiles.nth(0).getByTestId("tile-value").textContent());
  const linesCount = Number(await tiles.nth(1).getByTestId("tile-value").textContent());
  expect(packagesCount).toBeGreaterThanOrEqual(3);
  expect(linesCount).toBe(packagesCount * 5);

  const upcoming = page.getByTestId("upcoming-list");
  const soonRow = upcoming.getByRole("listitem").filter({ hasText: soon }).filter({ hasText: "نهاية الخصم" });
  await expect(soonRow).toContainText("ينتهي قريباً");
  await expect(soonRow).toContainText("10 أيام متبقية");

  const cashbackRow = upcoming.getByRole("listitem").filter({ hasText: soon }).filter({ hasText: "نهاية الكاش باك" });
  await expect(cashbackRow).toContainText("ينتهي قريباً");
  await expect(cashbackRow).toContainText("30 يوماً متبقياً");

  const endedRow = upcoming.getByRole("listitem").filter({ hasText: ended }).filter({ hasText: "نهاية الكاش باك" });
  await expect(endedRow).toContainText("منتهي");
  await expect(endedRow).toContainText("انتهى منذ 50 يوماً");

  const activeRow = upcoming.getByRole("listitem").filter({ hasText: active });
  await expect(activeRow).toContainText("نشط");

  // المنتهية تأتي بعد القادمة
  const texts = await upcoming.getByRole("listitem").allTextContents();
  const firstEnded = texts.findIndex((t) => t.includes("منتهي"));
  const lastUpcoming = texts.reduce((last, t, i) => (t.includes("منتهي") ? last : i), -1);
  expect(firstEnded === -1 || firstEnded > lastUpcoming).toBeTruthy();

  const activeCard = page.getByTestId("package-list").getByRole("listitem").filter({ hasText: active });
  await expect(activeCard).toContainText("غير محدد");
  await expect(activeCard).toContainText("5 فترات غير مدفوعة");
});
