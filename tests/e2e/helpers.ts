import { expect, type Page } from "@playwright/test";
import { E2E_ENV } from "../../playwright.config";

export const TODAY = E2E_ENV.RAQI_TODAY;
export const PASSWORD = E2E_ENV.APP_PASSWORD;

export interface PackageInput {
  name: string;
  discountStart: string;
  discountEnd?: string;
  cashbackEnd?: string;
  notes?: string;
}

/** ينشئ باقة عبر الواجهة ويعيد معرّفها من الرابط. */
export async function createPackage(page: Page, input: PackageInput): Promise<number> {
  await page.goto("/packages/new");
  await page.getByLabel("اسم الباقة").fill(input.name);
  await page.getByLabel("تفعيل الخصم").fill(input.discountStart);
  if (input.discountEnd) await page.getByLabel("نهاية الخصم").fill(input.discountEnd);
  if (input.cashbackEnd) await page.getByLabel("نهاية الكاش باك").fill(input.cashbackEnd);
  if (input.notes) await page.getByLabel("ملاحظات").fill(input.notes);
  await page.getByRole("button", { name: "إنشاء الباقة" }).click();
  await expect(page).toHaveURL(/\/packages\/\d+$/);
  const match = /\/packages\/(\d+)$/.exec(page.url());
  return Number(match![1]);
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}`;
}
