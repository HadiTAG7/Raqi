import { expect, test } from "@playwright/test";
import { createPackage, uniqueName } from "./helpers";

test("التصدير يعيد JSON كاملاً", async ({ page, request }) => {
  const name = uniqueName("باقة التصدير");
  const id = await createPackage(page, { name, discountStart: "2026-08-01" });
  await page.locator("#line-1").getByRole("button", { name: /^أغسطس 2026/ }).click();
  await expect(page.locator("#line-1").getByRole("button", { name: /^أغسطس 2026/ })).toHaveAttribute("aria-pressed", "true");

  const response = await request.get("/api/export");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(response.headers()["content-disposition"]).toContain('filename="raqi-backup-2026-09-20.json"');

  const body = (await response.json()) as { exportedAt: string; version: number; packages: Array<{ id: number; name: string; lines: Array<{ slot: number; payments: Array<{ period: string }> }> }> };
  expect(body.version).toBe(1);
  const pkg = body.packages.find((p) => p.id === id);
  expect(pkg?.name).toBe(name);
  expect(pkg?.lines).toHaveLength(5);
  expect(pkg?.lines[0].payments.map((p) => p.period)).toEqual(["2026-08"]);
});
