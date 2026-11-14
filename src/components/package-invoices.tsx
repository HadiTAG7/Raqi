"use client";

import { useOptimistic, useState, useTransition, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { setPackageInvoiceAmountAction, setPackageInvoicePaidAction } from "@/actions/package-invoices";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { formatIsoDate } from "@/lib/dates";
import { labels } from "@/lib/labels";
import { CURRENCY_LABEL, amountToInput, formatAmount, parseAmount } from "@/lib/money";
import { packageInvoiceTotals, type PackageInvoiceView, type PeopleTotals } from "@/lib/package-billing";
import { formatPeriod, type BillingCycle } from "@/lib/periods";

const DEFAULT_VISIBLE = 12;

type InvoiceUpdate = { period: string; amountHalalas?: number | null; paid?: boolean };

function Stat({ label, value, tone = "neutral", testId }: { label: string; value: string; tone?: "neutral" | "success" | "warning"; testId?: string }) {
  const toneClass =
    tone === "warning" ? "text-amber-800 dark:text-amber-300" : tone === "success" ? "text-emerald-800 dark:text-emerald-300" : "text-stone-900 dark:text-stone-100";
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 dark:bg-stone-800/50 px-3 py-2.5 sm:flex-col sm:items-start sm:justify-start sm:gap-1 sm:py-3">
      <dt className="text-xs text-stone-600 dark:text-stone-400">{label}</dt>
      <dd className={`text-base font-semibold sm:text-lg ${toneClass}`} data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}

export function PackageInvoices({
  packageId,
  cycle,
  start,
  startsInFuture,
  invoices,
  people,
}: {
  packageId: number;
  cycle: BillingCycle;
  start: string;
  startsInFuture: boolean;
  /** فترات الباقة تصاعدياً من تفعيل الخصم حتى اليوم */
  invoices: PackageInvoiceView[];
  /** إجماليات الأشخاص (لا تتغيّر بتعديل فواتير الباقة) */
  people: PeopleTotals;
}) {
  const [optimistic, applyOptimistic] = useOptimistic(invoices, (current: PackageInvoiceView[], update: InvoiceUpdate) =>
    current.map((inv) =>
      inv.period === update.period
        ? { ...inv, ...(update.amountHalalas !== undefined ? { amountHalalas: update.amountHalalas } : {}), ...(update.paid !== undefined ? { paid: update.paid } : {}) }
        : inv,
    ),
  );
  const [pending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // أخطاء إدخال المبلغ لكل فترة (تُتحقق في المتصفح قبل الإرسال)
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});

  const totals = packageInvoiceTotals(optimistic);
  const newestFirst = [...optimistic].reverse();
  const visible = showAll ? newestFirst : newestFirst.slice(0, DEFAULT_VISIBLE);

  const run = (update: InvoiceUpdate, call: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      applyOptimistic(update);
      const result = await call();
      if (!result.ok) setError(result.error ?? labels.packageBill.error);
    });
  };

  const saveAmount = (inv: PackageInvoiceView, text: string) => {
    const parsed = parseAmount(text);
    if (!parsed.ok) {
      setInvalid((current) => ({ ...current, [inv.period]: true }));
      return;
    }
    setInvalid((current) => ({ ...current, [inv.period]: false }));
    if (parsed.halalas === inv.amountHalalas) return;
    run({ period: inv.period, amountHalalas: parsed.halalas }, () => setPackageInvoiceAmountAction(packageId, inv.period, text));
  };

  const togglePaid = (inv: PackageInvoiceView) => {
    const paid = !inv.paid;
    run({ period: inv.period, paid }, () => setPackageInvoicePaidAction(packageId, inv.period, paid));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter يحفظ عبر blur (نفس مسار الخروج من الخانة)
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const hasComparison = people.expectedHalalas > 0 && totals.recordedHalalas > 0;
  const difference = people.expectedHalalas - totals.recordedHalalas;

  return (
    <Card aria-labelledby="package-bill-title" data-testid="package-invoices">
      <CardHeader>
        <CardTitle>
          <span id="package-bill-title">{labels.packageBill.title}</span>
        </CardTitle>
        <span className="text-xs text-stone-500 dark:text-stone-400">{cycle === "yearly" ? labels.line.yearly : labels.line.monthly}</span>
      </CardHeader>

      {startsInFuture ? (
        <p className="text-sm text-stone-600 dark:text-stone-400">{labels.packageBill.startsInFuture(formatIsoDate(start))}</p>
      ) : (
        <div className="flex flex-col gap-5">
          <dl className="grid gap-2 sm:grid-cols-3 sm:gap-3">
            <Stat label={labels.packageBill.recorded} value={formatAmount(totals.recordedHalalas)} testId="bill-recorded" />
            <Stat label={labels.packageBill.paidTotal} value={formatAmount(totals.paidHalalas)} tone="success" testId="bill-paid" />
            <Stat label={labels.packageBill.owed} value={formatAmount(totals.owedHalalas)} tone={totals.owedHalalas > 0 ? "warning" : "neutral"} testId="bill-owed" />
          </dl>
          {totals.missingAmountCount > 0 ? (
            <p className="-mt-2 text-xs text-stone-500 dark:text-stone-400" data-testid="bill-missing">
              {labels.packageBill.missing(totals.missingAmountCount)} · {labels.packageBill.missingNote}
            </p>
          ) : null}

          <div className="flex flex-col gap-3">
            <p className="text-xs text-stone-500 dark:text-stone-400">{labels.packageBill.hint}</p>
            <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2" aria-busy={pending}>
              {visible.map((inv) => {
                const periodLabel = formatPeriod(inv.period, cycle);
                const inputId = `bill-${inv.period}`;
                return (
                  <li
                    key={inv.period}
                    data-testid="bill-row"
                    className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-stone-200 dark:border-stone-800 p-2 ps-3 sm:flex-nowrap"
                  >
                    <label htmlFor={inputId} className="w-full truncate text-sm font-medium sm:w-auto sm:min-w-0 sm:flex-1">
                      {periodLabel}
                    </label>
                    <div className="relative min-w-0 flex-1 sm:w-28 sm:flex-none">
                      <Input
                        // يُعاد تركيبه عند تغيّر المبلغ المحفوظ ليعرض القيمة بعد التنسيق
                        key={`${inv.period}:${inv.amountHalalas ?? ""}`}
                        id={inputId}
                        defaultValue={amountToInput(inv.amountHalalas)}
                        inputMode="decimal"
                        dir="ltr"
                        autoComplete="off"
                        aria-label={labels.packageBill.amountFor(periodLabel)}
                        aria-invalid={invalid[inv.period] ? true : undefined}
                        onBlur={(event) => saveAmount(inv, event.currentTarget.value)}
                        onKeyDown={onKeyDown}
                        className="pl-11 text-right"
                        placeholder="0"
                      />
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-stone-500 dark:text-stone-400" aria-hidden>
                        {CURRENCY_LABEL}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-pressed={inv.paid}
                      aria-label={`${periodLabel}: ${inv.paid ? labels.packageBill.paid : labels.packageBill.unpaid}`}
                      onClick={() => togglePaid(inv)}
                      className={`flex h-10 min-w-0 flex-1 items-center justify-center sm:w-32 sm:flex-none gap-1.5 rounded-lg border px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                        inv.paid
                          ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                          : "border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                      }`}
                    >
                      {inv.paid ? <Check className="size-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden /> : null}
                      {inv.paid ? labels.packageBill.paid : labels.packageBill.unpaid}
                    </button>
                  </li>
                );
              })}
            </ul>
            {Object.values(invalid).some(Boolean) ? (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {labels.errors.invalidAmount}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            ) : null}
            {optimistic.length > DEFAULT_VISIBLE ? (
              <Button variant="ghost" size="sm" className="self-start" onClick={() => setShowAll((v) => !v)}>
                {showAll ? labels.packageBill.showLess : `${labels.packageBill.showAll} (${optimistic.length})`}
              </Button>
            ) : null}
          </div>

          <section aria-labelledby="bill-comparison-title" className="flex flex-col gap-3 border-t border-stone-200 dark:border-stone-800 pt-4" data-testid="bill-comparison">
            <h3 id="bill-comparison-title" className="text-sm font-semibold">
              {labels.packageBill.comparisonTitle}
            </h3>
            <dl className="grid gap-2 sm:grid-cols-3 sm:gap-3">
              <Stat label={labels.packageBill.peopleExpected} value={formatAmount(people.expectedHalalas)} testId="people-expected" />
              <Stat label={labels.packageBill.peopleCollected} value={formatAmount(people.collectedHalalas)} tone="success" testId="people-collected" />
              <Stat label={labels.packageBill.peopleDue} value={formatAmount(people.dueHalalas)} tone={people.dueHalalas > 0 ? "warning" : "neutral"} testId="people-due" />
            </dl>
            {hasComparison ? (
              <p
                data-testid="bill-difference"
                className={`rounded-lg p-3 text-sm font-medium ${
                  difference < 0
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200"
                    : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                }`}
              >
                {labels.packageBill.difference}: {difference < 0 ? labels.packageBill.youBear(formatAmount(-difference)) : difference > 0 ? labels.packageBill.surplus(formatAmount(difference)) : labels.packageBill.even}
              </p>
            ) : (
              <p className="text-sm text-stone-600 dark:text-stone-400">{labels.packageBill.noComparison}</p>
            )}
            {people.unpricedCount > 0 ? <p className="text-xs text-stone-500 dark:text-stone-400">{labels.packageBill.unpriced(people.unpricedCount)}</p> : null}
          </section>
        </div>
      )}
    </Card>
  );
}
