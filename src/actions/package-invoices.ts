"use server";

import { revalidatePath } from "next/cache";
import { updatePackageInvoice } from "@/db/mutations";
import { getPackage } from "@/db/queries";
import { daysBetween, todayRiyadh } from "@/lib/dates";
import { labels } from "@/lib/labels";
import { parseAmount } from "@/lib/money";
import { isValidPeriod, periodsBetween } from "@/lib/periods";
import { requireSession } from "@/lib/session";

export type PackageInvoiceResult =
  | { ok: true; period: string; amountHalalas: number | null; paid: boolean }
  | { ok: false; error: string };

/** يتحقق أن الفترة من فترات الباقة الحالية (حسب دورتها وتاريخ تفعيل الخصم حتى اليوم). */
async function checkPeriod(packageId: number, period: unknown): Promise<string | null> {
  if (!Number.isSafeInteger(packageId) || packageId <= 0) return labels.packageBill.error;
  const pkg = await getPackage(packageId);
  if (!pkg) return labels.packageBill.error;
  if (!isValidPeriod(period, pkg.billCycle)) return labels.packageBill.error;
  const today = todayRiyadh();
  if (daysBetween(today, pkg.discountStart) > 0) return labels.packageBill.error;
  if (!periodsBetween(pkg.discountStart, today, pkg.billCycle).includes(period)) return labels.packageBill.error;
  return null;
}

/** يسجّل مبلغ فاتورة باقة لفترة (النص الفارغ يمسح المبلغ). */
export async function setPackageInvoiceAmountAction(packageId: number, period: string, amountText: string): Promise<PackageInvoiceResult> {
  await requireSession();
  const parsed = parseAmount(amountText);
  if (!parsed.ok) return { ok: false, error: labels.errors.invalidAmount };
  const problem = await checkPeriod(packageId, period);
  if (problem) return { ok: false, error: problem };
  const result = await updatePackageInvoice(packageId, period, { amountHalalas: parsed.halalas });
  revalidatePath("/", "layout");
  return { ok: true, period, ...result };
}

/** يضبط حالة دفع فاتورة باقة للشركة (قيمة صريحة، فلا يتأثر بتكرار الضغط). */
export async function setPackageInvoicePaidAction(packageId: number, period: string, paid: boolean): Promise<PackageInvoiceResult> {
  await requireSession();
  if (typeof paid !== "boolean") return { ok: false, error: labels.packageBill.error };
  const problem = await checkPeriod(packageId, period);
  if (problem) return { ok: false, error: problem };
  const result = await updatePackageInvoice(packageId, period, { paid });
  revalidatePath("/", "layout");
  return { ok: true, period, ...result };
}
