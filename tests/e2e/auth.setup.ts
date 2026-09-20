import { expect, test as setup } from "@playwright/test";
import { AUTH_STATE } from "../../playwright.config";
import { PASSWORD } from "./helpers";

setup("تسجيل الدخول وحفظ الجلسة", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("كلمة المرور").fill(PASSWORD);
  await page.getByRole("button", { name: "دخول" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1, name: "الرئيسية" })).toBeVisible();
  await page.context().storageState({ path: AUTH_STATE });
});
