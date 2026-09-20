"use server";

import { revalidatePath } from "next/cache";
import { togglePayment } from "@/db/mutations";
import { getLine, getPackage } from "@/db/queries";
import { effectiveBillingStart } from "@/lib/billing";
import { daysBetween, todayRiyadh } from "@/lib/dates";
import { labels } from "@/lib/labels";
import { isValidPeriod, periodsBetween } from "@/lib/periods";
import { requireSession } from "@/lib/session";

export type ToggleResult = { ok: true; paid: boolean } | { ok: false; error: string };

export async function togglePaymentAction(lineId: number, period: string): Promise<ToggleResult> {
  await requireSession();
  if (!Number.isSafeInteger(lineId) || lineId <= 0) return { ok: false, error: labels.payments.error };

  const line = await getLine(lineId);
  if (!line) return { ok: false, error: labels.payments.error };
  const pkg = await getPackage(line.packageId);
  if (!pkg) return { ok: false, error: labels.payments.error };

  const cycle = line.billingCycle;
  if (!isValidPeriod(period, cycle)) return { ok: false, error: labels.payments.error };

  const today = todayRiyadh();
  const start = effectiveBillingStart(line, pkg);
  if (daysBetween(today, start) > 0) return { ok: false, error: labels.payments.error };
  if (!periodsBetween(start, today, cycle).includes(period)) return { ok: false, error: labels.payments.error };

  const result = await togglePayment(lineId, period);
  revalidatePath("/", "layout");
  return { ok: true, paid: result.paid };
}
