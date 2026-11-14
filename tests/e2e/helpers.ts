import { expect, type Page } from "@playwright/test";
import { E2E_ENV } from "../../playwright.config";

export const TODAY = E2E_ENV.RAQI_TODAY;
export const PASSWORD = E2E_ENV.APP_PASSWORD;

export interface PackageInput {
  name: string;
  discountStart: string;
  /** مدة الخصم بالأشهر (3 أو 6 أو 12)؛ تاريخ النهاية يحسبه التطبيق */
  discountMonths?: 3 | 6 | 12;
  cashbackStart?: string;
  cashbackMonths?: 3 | 6 | 12;
  notes?: string;
}

/** ينشئ باقة عبر الواجهة ويعيد معرّفها من الرابط. */
export async function createPackage(page: Page, input: PackageInput): Promise<number> {
  await page.goto("/packages/new");
  await page.getByLabel("اسم الباقة").fill(input.name);
  await page.getByLabel("تفعيل الخصم").fill(input.discountStart);
  if (input.discountMonths) await page.getByLabel("مدة الخصم").selectOption(String(input.discountMonths));
  if (input.cashbackStart) await page.getByLabel("تفعيل الكاش باك").fill(input.cashbackStart);
  if (input.cashbackMonths) await page.getByLabel("مدة الكاش باك").selectOption(String(input.cashbackMonths));
  if (input.notes) await page.getByLabel("ملاحظات").fill(input.notes);
  await page.getByRole("button", { name: "إنشاء الباقة" }).click();
  await expect(page).toHaveURL(/\/packages\/\d+$/);
  const match = /\/packages\/(\d+)$/.exec(page.url());
  return Number(match![1]);
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}`;
}
