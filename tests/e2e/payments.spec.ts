import { expect, test } from "@playwright/test";
import { createPackage, uniqueName } from "./helpers";

test("تبديل حالة الدفع يُحفظ ويظهر في الرئيسية", async ({ page }) => {
  const name = uniqueName("باقة الدفع");
  const id = await createPackage(page, { name, discountStart: "2026-06-15" });
  const card = page.locator("#line-1");

  // يونيو، يوليو، أغسطس، سبتمبر 2026
  const cells = card.getByRole("button", { name: /2026:/ });
  await expect(cells).toHaveCount(4);
  await expect(cells.first()).toHaveAccessibleName(/^سبتمبر 2026/);
  await expect(card.getByText("4 فترات غير مدفوعة")).toBeVisible();

  const september = card.getByRole("button", { name: /^سبتمبر 2026/ });
  await expect(september).toHaveAttribute("aria-pressed", "false");
  await september.click();
  await expect(september).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByText("3 فترات غير مدفوعة")).toBeVisible();

  await page.reload();
  await expect(card.getByRole("button", { name: /^سبتمبر 2026/ })).toHaveAttribute("aria-pressed", "true");

  await page.goto("/");
  const group = page.getByTestId("unpaid-group").filter({ hasText: name });
  await expect(group).toHaveCount(1);
  await expect(group.getByTestId("unpaid-line")).toHaveCount(4);
  await expect(group.getByTestId("unpaid-line").filter({ hasText: "الشريحة 1" })).toHaveCount(0);
  await expect(group.getByTestId("unpaid-line").filter({ hasText: "الشريحة 2 (دولي)" })).toContainText("سبتمبر 2026");

  await page.goto(`/packages/${id}`);
  await card.getByRole("button", { name: /^سبتمبر 2026/ }).click();
  await expect(card.getByRole("button", { name: /^سبتمبر 2026/ })).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(card.getByRole("button", { name: /^سبتمبر 2026/ })).toHaveAttribute("aria-pressed", "false");
});
