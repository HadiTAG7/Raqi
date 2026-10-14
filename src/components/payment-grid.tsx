"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { togglePaymentAction } from "@/actions/payments";
import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";
import { formatPeriod, type BillingCycle } from "@/lib/periods";

const DEFAULT_VISIBLE = 12;

export function PaymentGrid({
  lineId,
  cycle,
  periods,
  paidPeriods,
}: {
  lineId: number;
  cycle: BillingCycle;
  /** الفترات تصاعدياً من البداية حتى اليوم */
  periods: string[];
  paidPeriods: string[];
}) {
  const [optimisticPaid, applyOptimistic] = useOptimistic(
    paidPeriods,
    (current: string[], update: { period: string; paid: boolean }) =>
      update.paid ? [...current, update.period] : current.filter((p) => p !== update.period),
  );
  const [pending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paidSet = new Set(optimisticPaid);
  const newestFirst = [...periods].reverse();
  const visible = showAll ? newestFirst : newestFirst.slice(0, DEFAULT_VISIBLE);
  const unpaidCount = periods.filter((p) => !paidSet.has(p)).length;

  const toggle = (period: string) => {
    const nextPaid = !paidSet.has(period);
    setError(null);
    startTransition(async () => {
      applyOptimistic({ period, paid: nextPaid });
      const result = await togglePaymentAction(lineId, period);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-sm font-medium ${unpaidCount > 0 ? "text-amber-800 dark:text-amber-300" : "text-emerald-800 dark:text-emerald-300"}`}>
          {labels.payments.unpaidCount(unpaidCount)}
        </p>
        <p className="text-xs text-stone-500 dark:text-stone-400">{labels.payments.toggleHint}</p>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4" aria-busy={pending}>
        {visible.map((period) => {
          const paid = paidSet.has(period);
          const label = formatPeriod(period, cycle);
          return (
            <li key={period}>
              <button
                type="button"
                aria-pressed={paid}
                aria-label={`${label}: ${paid ? labels.payments.paid : labels.payments.unpaid}`}
                onClick={() => toggle(period)}
                className={`flex h-12 w-full items-center justify-between gap-2 rounded-lg border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                  paid
                    ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                    : "border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                <span className="font-medium">{label}</span>
                {paid ? (
                  <Check className="size-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
                ) : (
                  <span className="text-xs text-stone-500 dark:text-stone-400">{labels.payments.unpaid}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {error ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {periods.length > DEFAULT_VISIBLE ? (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setShowAll((v) => !v)}>
          {showAll ? labels.payments.showLess : `${labels.payments.showAll} (${periods.length})`}
        </Button>
      ) : null}
    </div>
  );
}
