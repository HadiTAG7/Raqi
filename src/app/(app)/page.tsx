import Link from "next/link";
import { AlertTriangle, CalendarClock, Layers, PlusCircle, Smartphone } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { isDbConfigured } from "@/db/client";
import { getAllPackages } from "@/db/queries";
import { buildDashboard, type DateKind } from "@/lib/dashboard";
import { formatIsoDate, todayRiyadh } from "@/lib/dates";
import { labels } from "@/lib/labels";
import { formatPeriod } from "@/lib/periods";
import { LINE_TYPE_LABELS } from "@/lib/slots";

const kindLabel: Record<DateKind, string> = {
  discountEnd: labels.package.discountEnd,
  cashbackEnd: labels.package.cashbackEnd,
};

function daysText(daysLeft: number): string {
  return daysLeft < 0 ? labels.package.daysAgo(-daysLeft) : labels.package.daysLeft(daysLeft);
}

export default async function DashboardPage() {
  if (!isDbConfigured()) return null;
  const today = todayRiyadh();
  const packages = await getAllPackages();
  const data = buildDashboard(packages, today);

  const tiles = [
    { label: labels.dashboard.tiles.packages, value: data.tiles.packages, Icon: Layers },
    { label: labels.dashboard.tiles.lines, value: data.tiles.lines, Icon: Smartphone },
    { label: labels.dashboard.tiles.unpaid, value: data.tiles.unpaidCurrent, Icon: AlertTriangle },
    { label: labels.dashboard.tiles.endingSoon, value: data.tiles.endingSoon, Icon: CalendarClock },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{labels.dashboard.title}</h1>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {labels.dashboard.today}: {formatIsoDate(today)}
          </p>
        </div>
        <LinkButton href="/packages/new">
          <PlusCircle className="size-4" aria-hidden />
          {labels.nav.newPackage}
        </LinkButton>
      </div>

      <section aria-label="ملخص" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(({ label, value, Icon }) => (
          <Card key={label} className="flex flex-col gap-2 p-4" data-testid="tile">
            <div className="flex items-center justify-between gap-2 text-sm text-stone-600 dark:text-stone-400">
              <span>{label}</span>
              <Icon className="size-4 text-stone-400 dark:text-stone-500" aria-hidden />
            </div>
            <p className="text-3xl font-semibold text-stone-900 dark:text-stone-100" data-testid="tile-value">
              {value}
            </p>
          </Card>
        ))}
      </section>

      {data.packages.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-stone-600 dark:text-stone-400">{labels.dashboard.packagesEmpty}</p>
          <LinkButton href="/packages/new">
            <PlusCircle className="size-4" aria-hidden />
            {labels.dashboard.addFirst}
          </LinkButton>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card aria-labelledby="upcoming-title">
              <CardHeader>
                <CardTitle>
                  <span id="upcoming-title">{labels.dashboard.upcoming}</span>
                </CardTitle>
              </CardHeader>
              {data.upcoming.length === 0 ? (
                <p className="text-sm text-stone-600 dark:text-stone-400">{labels.dashboard.upcomingEmpty}</p>
              ) : (
                <ul className="divide-y divide-stone-100 dark:divide-stone-800" data-testid="upcoming-list">
                  {data.upcoming.map((item) => (
                    <li key={`${item.packageId}-${item.kind}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div className="flex flex-col">
                        <Link href={`/packages/${item.packageId}`} className="font-medium text-teal-800 dark:text-teal-300 hover:underline">
                          {item.packageName}
                        </Link>
                        <span className="text-xs text-stone-600 dark:text-stone-400">
                          {kindLabel[item.kind]} · {formatIsoDate(item.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-600 dark:text-stone-400">{daysText(item.daysLeft)}</span>
                        <StatusBadge status={item.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card aria-labelledby="unpaid-title">
              <CardHeader>
                <CardTitle>
                  <span id="unpaid-title">{labels.dashboard.unpaidList}</span>
                </CardTitle>
              </CardHeader>
              {data.unpaidGroups.length === 0 ? (
                <p className="text-sm text-emerald-800 dark:text-emerald-300">{labels.dashboard.unpaidEmpty}</p>
              ) : (
                <ul className="divide-y divide-stone-100 dark:divide-stone-800" data-testid="unpaid-list">
                  {data.unpaidGroups.map((group) => (
                    <li key={group.packageId} className="py-2.5" data-testid="unpaid-group">
                      <Link href={`/packages/${group.packageId}`} className="font-medium text-teal-800 dark:text-teal-300 hover:underline">
                        {group.packageName}
                      </Link>
                      <ul className="mt-1.5 flex flex-wrap gap-1.5">
                        {group.items.map((item) => (
                          <li key={item.lineId}>
                            <Link
                              href={`/packages/${item.packageId}#line-${item.slot}`}
                              data-testid="unpaid-line"
                              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 text-xs text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                            >
                              <span className="font-medium">
                                {labels.line.slot(item.slot)} ({LINE_TYPE_LABELS[item.type]})
                              </span>
                              {item.holderName ? <span>· {item.holderName}</span> : null}
                              <span className="text-amber-700 dark:text-amber-400">· {formatPeriod(item.period, item.cycle)}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <section aria-labelledby="packages-title" className="flex flex-col gap-3">
            <h2 id="packages-title" className="text-lg font-semibold">
              {labels.dashboard.packagesList}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="package-list">
              {data.packages.map((pkg) => (
                <li key={pkg.id}>
                  <Link href={`/packages/${pkg.id}`} className="block h-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-xs transition-colors hover:border-teal-300 dark:hover:border-teal-700 hover:bg-teal-50/40 dark:hover:bg-teal-950/30">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-stone-900 dark:text-stone-100">{pkg.name}</h3>
                      {pkg.unpaidPeriods > 0 ? <Badge tone="warning">{labels.payments.unpaidCount(pkg.unpaidPeriods)}</Badge> : <Badge tone="success">{labels.payments.unpaidCount(0)}</Badge>}
                    </div>
                    <dl className="grid gap-1.5 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-stone-600 dark:text-stone-400">{labels.package.discountStart}</dt>
                        <dd>{formatIsoDate(pkg.discountStart)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-stone-600 dark:text-stone-400">{labels.package.discountEnd}</dt>
                        <dd className="flex items-center gap-2">
                          {formatIsoDate(pkg.discountEnd, labels.package.unsetDate)}
                          <StatusBadge status={pkg.discountStatus} />
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-stone-600 dark:text-stone-400">{labels.package.cashbackEnd}</dt>
                        <dd className="flex items-center gap-2">
                          {formatIsoDate(pkg.cashbackEnd, labels.package.unsetDate)}
                          <StatusBadge status={pkg.cashbackStatus} />
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-3 border-t border-stone-200 dark:border-stone-800 pt-3">
                      <p className="mb-1.5 text-xs font-medium text-stone-600 dark:text-stone-400">
                        {labels.people.title} <span className="ltr-digits">({pkg.filledLines}/5)</span>
                      </p>
                      <ul className="grid gap-1 text-sm" data-testid="package-people">
                        {pkg.people.map((person) => (
                          <li key={person.slot} className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="w-10 shrink-0 text-xs text-stone-500 dark:text-stone-400">{LINE_TYPE_LABELS[person.type]}</span>
                              <span className={person.holderName ? "truncate text-stone-900 dark:text-stone-100" : "text-stone-400 dark:text-stone-500"}>
                                {person.holderName || labels.people.empty}
                              </span>
                            </span>
                            {person.phoneNumber ? (
                              <span className="ltr-digits shrink-0 text-xs text-stone-600 dark:text-stone-400">{person.phoneNumber}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
