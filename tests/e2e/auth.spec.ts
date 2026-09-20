import { expect, test } from "@playwright/test";
import { PASSWORD } from "./helpers";

test.describe("بدون جلسة", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("الصفحة الرئيسية تُعيد التوجيه إلى تسجيل الدخول", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("heading", { name: "تسجيل الدخول" })).toBeVisible();
  });

  test("الصفحات الداخلية تحفظ الوجهة في next", async ({ page }) => {
    await page.goto("/packages/new");
    await expect(page).toHaveURL(/\/login\?next=%2Fpackages%2Fnew$/);
  });

  test("مسار التصدير محمي", async ({ request }) => {
    const response = await request.get("/api/export", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toContain("/login");
  });

  test("كلمة مرور خاطئة تعرض خطأ", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("كلمة المرور").fill("wrong-password");
    await page.getByRole("button", { name: "دخول" }).click();
    await expect(page.getByText("كلمة المرور غير صحيحة")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("الدخول الصحيح يذهب إلى الوجهة المطلوبة", async ({ page }) => {
    await page.goto("/login?next=%2Fpackages%2Fnew");
    await page.getByLabel("كلمة المرور").fill(PASSWORD);
    await page.getByRole("button", { name: "دخول" }).click();
    await expect(page).toHaveURL("/packages/new");
  });

  test("وجهة خارجية في next تُرفض", async ({ page }) => {
    await page.goto("/login?next=https%3A%2F%2Fevil.example");
    await page.getByLabel("كلمة المرور").fill(PASSWORD);
    await page.getByRole("button", { name: "دخول" }).click();
    await expect(page).toHaveURL("/");
  });
});

test("تسجيل الخروج ينهي الجلسة", async ({ browser }) => {
  const context = await browser.newContext({ storageState: "tests/.auth/state.json" });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "تسجيل الخروج" }).click();
  await expect(page).toHaveURL("/login");
  await page.goto("/");
  await expect(page).toHaveURL("/login");
  await context.close();
});

test("صفحة الدخول تُعيد المسجّل إلى الرئيسية", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL("/");
});
