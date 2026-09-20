"use client";

import { useActionState } from "react";
import { updateLineAction } from "@/actions/lines";
import { PaymentGrid } from "@/components/payment-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { formatIsoDate } from "@/lib/dates";
import { labels } from "@/lib/labels";
import type { BillingCycle } from "@/lib/periods";
import { LINE_TYPE_LABELS, type LineType } from "@/lib/slots";
import { idleFormState } from "@/lib/validation";

export interface LineCardData {
  id: number;
  slot: number;
  type: LineType;
  holderName: string | null;
  phoneNumber: string | null;
  simReference: string | null;
  billingCycle: BillingCycle;
  billingStart: string | null;
  notes: string | null;
}

export function LineCard({
  line,
  effectiveStart,
  periods,
  paidPeriods,
  startsInFuture,
}: {
  line: LineCardData;
  effectiveStart: string;
  periods: string[];
  paidPeriods: string[];
  startsInFuture: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateLineAction.bind(null, line.id), idleFormState);
  const values = {
    holderName: line.holderName ?? "",
    phoneNumber: line.phoneNumber ?? "",
    simReference: line.simReference ?? "",
    billingCycle: line.billingCycle,
    billingStart: line.billingStart ?? "",
    notes: line.notes ?? "",
    ...(state.values ?? {}),
  };
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];
  const prefix = `line-${line.id}`;

  return (
    <Card id={`line-${line.slot}`} className="flex flex-col gap-5">
      <CardHeader className="mb-0">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{labels.line.slot(line.slot)}</CardTitle>
          <Badge tone={line.type === "primary" ? "info" : "neutral"}>{LINE_TYPE_LABELS[line.type]}</Badge>
        </div>
        <span className="text-sm text-stone-600">
          {line.holderName || labels.line.empty}
          {line.phoneNumber ? (
            <>
              {" · "}
              <span className="ltr-digits">{line.phoneNumber}</span>
            </>
          ) : null}
        </span>
      </CardHeader>

      <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" noValidate>
        <Field label={labels.line.holderName} htmlFor={`${prefix}-holderName`} error={errorFor("holderName")}>
          <Input id={`${prefix}-holderName`} name="holderName" defaultValue={values.holderName} maxLength={100} />
        </Field>
        <Field label={labels.line.phoneNumber} htmlFor={`${prefix}-phoneNumber`} error={errorFor("phoneNumber")}>
          <Input id={`${prefix}-phoneNumber`} name="phoneNumber" defaultValue={values.phoneNumber} dir="ltr" inputMode="tel" maxLength={30} className="ltr-digits" />
        </Field>
        <Field label={labels.line.simReference} htmlFor={`${prefix}-simReference`} error={errorFor("simReference")}>
          <Input id={`${prefix}-simReference`} name="simReference" defaultValue={values.simReference} dir="ltr" inputMode="numeric" maxLength={60} className="ltr-digits" />
        </Field>
        <Field label={labels.line.billingCycle} htmlFor={`${prefix}-billingCycle`} error={errorFor("billingCycle")}>
          <Select id={`${prefix}-billingCycle`} name="billingCycle" defaultValue={values.billingCycle}>
            <option value="monthly">{labels.line.monthly}</option>
            <option value="yearly">{labels.line.yearly}</option>
          </Select>
        </Field>
        <Field label={labels.line.billingStart} htmlFor={`${prefix}-billingStart`} error={errorFor("billingStart")} hint={labels.line.billingStartHint}>
          <Input id={`${prefix}-billingStart`} name="billingStart" type="date" defaultValue={values.billingStart} dir="ltr" />
        </Field>
        <Field label={labels.line.notes} htmlFor={`${prefix}-notes`} error={errorFor("notes")} className="sm:col-span-2 lg:col-span-1">
          <Textarea id={`${prefix}-notes`} name="notes" defaultValue={values.notes} maxLength={500} className="min-h-10" rows={1} />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? labels.line.saving : labels.line.save}
          </Button>
          {state.status === "success" ? (
            <span role="status" className="text-sm text-emerald-700">
              {labels.line.saved}
            </span>
          ) : null}
          {state.formError ? (
            <span role="alert" className="text-sm text-red-600">
              {state.formError}
            </span>
          ) : null}
        </div>
      </form>

      <section aria-label={labels.payments.title} className="border-t border-stone-200 pt-4">
        <h3 className="mb-3 text-sm font-semibold text-stone-800">
          {labels.payments.title}
          <span className="ms-2 text-xs font-normal text-stone-500">
            ({line.billingCycle === "monthly" ? labels.line.monthly : labels.line.yearly} · {labels.line.billingStart}: {formatIsoDate(effectiveStart)})
          </span>
        </h3>
        {startsInFuture ? (
          <p className="text-sm text-stone-600">{labels.payments.startsInFuture(formatIsoDate(effectiveStart))}</p>
        ) : (
          <PaymentGrid lineId={line.id} cycle={line.billingCycle} periods={periods} paidPeriods={paidPeriods} />
        )}
      </section>
    </Card>
  );
}
