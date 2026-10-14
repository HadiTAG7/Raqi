import { expect, test, type Page } from "@playwright/test";

const html = (page: Page) => page.locator("html");
const toggle = (page: Page) => page.getByRole("button", { name: /^المظهر:/ });

test.describe("جهاز بمظهر داكن", () => {
  test.use({ colorScheme: "dark" });

  test("يتبع الجهاز تلقائياً ثم يبدّل ويحفظ الاختيار", async ({ page }) => {
    await page.goto("/");
    await expect(html(page)).toHaveClass(/\bdark\b/);
    await expect(toggle(page)).toHaveAttribute("data-theme-preference", "system");
    await expect(toggle(page)).toContainText("تلقائي");

    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute("data-theme-preference", "light");
    await expect(html(page)).not.toHaveClass(/\bdark\b/);

    await page.reload();
    await expect(html(page)).not.toHaveClass(/\bdark\b/);
    await expect(toggle(page)).toHaveAttribute("data-theme-preference", "light");

    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute("data-theme-preference", "dark");
    await expect(html(page)).toHaveClass(/\bdark\b/);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).not.toBe("rgb(250, 250, 249)");

    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute("data-theme-preference", "system");
    await expect(html(page)).toHaveClass(/\bdark\b/);
    expect(await page.evaluate(() => localStorage.getItem("raqi-theme"))).toBeNull();
  });
});

test.describe("جهاز بمظهر فاتح", () => {
  test.use({ colorScheme: "light" });

  test("يبدأ فاتحاً واختيار الداكن يبقى بعد التنقل", async ({ page }) => {
    await page.goto("/");
    await expect(html(page)).not.toHaveClass(/\bdark\b/);
    await toggle(page).click(); // تلقائي -> فاتح
    await toggle(page).click(); // فاتح -> داكن
    await expect(html(page)).toHaveClass(/\bdark\b/);
    await page.goto("/packages/new");
    await expect(html(page)).toHaveClass(/\bdark\b/);
    await expect(toggle(page)).toHaveAttribute("data-theme-preference", "dark");
  });
});
