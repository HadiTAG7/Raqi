import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { deletePackageAction } from "@/actions/packages";
import { LineCard } from "@/components/line-card";
import { StatusBadge } from "@/components/status-badge";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { isDbConfigured } from "@/db/client";
import { getPackageWithLines } from "@/db/queries";
import { lineBilling } from "@/lib/billing";
import { dateStatus, daysBetween, formatIsoDate, todayRiyadh, type IsoDate } from "@/lib/dates";
import { labels } from "@/lib/labels";
import { parseId } from "@/lib/validation";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isDbConfigured()) return {};
  const id = parseId((await params).id);
  const pkg = id ? await getPackageWithLines(id) : null;
  return { title: pkg?.name ?? labels.package.notFound };
}

function DateBlock({ label, date, today }: { label: string; date: IsoDate | null; today: IsoDate }) {
  const status = dateStatus(date, today);
  const days = date && status !== "unset" ? daysBetween(today, date) : null;
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-stone-50 p-3">
      <dt className="text-xs text-stone-600">{label}</dt>
      <dd className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{formatIsoDate(date, labels.package.unsetDate)}</span>
        <StatusBadge status={status} />
      </dd>
      {days !== null ? (
        <dd className="text-xs text-stone-600">{days < 0 ? labels.package.daysAgo(-days) : labels.package.daysLeft(days)}</dd>
      ) : null}
    </div>
  );
}

export default async function PackagePage({ params }: Props) {
  if (!isDbConfigured()) return null;
  const id = parseId((await params).id);
  if (!id) notFound();
  const pkg = await getPackageWithLines(id);
  if (!pkg) notFound();

  const today = todayRiyadh();
  const paymentCount = pkg.lines.reduce((sum, line) => sum + line.payments.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{pkg.name}</h1>
            {pkg.notes ? <p className="mt-1 whitespace-pre-line text-sm text-stone-600">{pkg.notes}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            <LinkButton href={`/packages/${pkg.id}/edit`} variant="secondary" size="sm">
              <Pencil className="size-4" aria-hidden />
              {labels.common.edit}
            </LinkButton>
            <form action={deletePackageAction}>
              <input type="hidden" name="id" value={pkg.id} />
              <ConfirmButton variant="danger" size="sm" message={labels.package.deleteConfirm(paymentCount)}>
                <Trash2 className="size-4" aria-hidden />
                {labels.package.delete}
              </ConfirmButton>
            </form>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-lg bg-stone-50 p-3">
            <dt className="text-xs text-stone-600">{labels.package.discountStart}</dt>
            <dd className="font-medium">{formatIsoDate(pkg.discountStart)}</dd>
          </div>
          <DateBlock label={labels.package.discountEnd} date={pkg.discountEnd} today={today} />
          <DateBlock label={labels.package.cashbackEnd} date={pkg.cashbackEnd} today={today} />
        </dl>
      </Card>

      <section aria-labelledby="lines-title" className="flex flex-col gap-4">
        <h2 id="lines-title" className="text-lg font-semibold">
          {labels.package.lines}
        </h2>
        {pkg.lines.map((line) => {
          const billing = lineBilling(line, pkg, today);
          return (
            <LineCard
              key={line.id}
              line={{
                id: line.id,
                slot: line.slot,
                type: line.type,
                holderName: line.holderName,
                phoneNumber: line.phoneNumber,
                simReference: line.simReference,
                billingCycle: line.billingCycle,
                billingStart: line.billingStart,
                notes: line.notes,
              }}
              effectiveStart={billing.start}
              periods={billing.periods}
              paidPeriods={billing.paid}
              startsInFuture={billing.startsInFuture}
            />
          );
        })}
      </section>
    </div>
  );
}
