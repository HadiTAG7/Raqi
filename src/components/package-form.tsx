"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { labels } from "@/lib/labels";
import { LINE_SLOTS, LINE_TYPE_LABELS } from "@/lib/slots";
import { idleFormState, personFieldName, type FormState } from "@/lib/validation";

export interface PackageFormValues {
  name: string;
  notes: string;
  discountStart: string;
  discountEnd: string;
  cashbackEnd: string;
}

const emptyValues: PackageFormValues = { name: "", notes: "", discountStart: "", discountEnd: "", cashbackEnd: "" };

export function PackageForm({
  action,
  initial = emptyValues,
  submitLabel,
  cancelHref,
  withPeople = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: PackageFormValues;
  submitLabel: string;
  cancelHref: string;
  /** عرض حقول الأشخاص الخمسة (عند إنشاء باقة جديدة فقط) */
  withPeople?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, idleFormState);
  const values: Record<string, string> = { ...initial, ...(state.values ?? {}) };
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.formError ? (
        <p role="alert" className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-400">
          {state.formError}
        </p>
      ) : null}

      <Field label={labels.package.name} htmlFor="name" error={errorFor("name")}>
        <Input id="name" name="name" defaultValue={values.name} placeholder={labels.package.namePlaceholder} maxLength={100} aria-invalid={errorFor("name") ? true : undefined} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label={labels.package.discountStart} htmlFor="discountStart" error={errorFor("discountStart")}>
          <Input id="discountStart" name="discountStart" type="date" defaultValue={values.discountStart} dir="ltr" aria-invalid={errorFor("discountStart") ? true : undefined} />
        </Field>
        <Field label={labels.package.discountEnd} htmlFor="discountEnd" error={errorFor("discountEnd")}>
          <Input id="discountEnd" name="discountEnd" type="date" defaultValue={values.discountEnd} dir="ltr" aria-invalid={errorFor("discountEnd") ? true : undefined} />
        </Field>
        <Field label={labels.package.cashbackEnd} htmlFor="cashbackEnd" error={errorFor("cashbackEnd")}>
          <Input id="cashbackEnd" name="cashbackEnd" type="date" defaultValue={values.cashbackEnd} dir="ltr" aria-invalid={errorFor("cashbackEnd") ? true : undefined} />
        </Field>
      </div>

      <Field label={labels.package.notes} htmlFor="notes" error={errorFor("notes")}>
        <Textarea id="notes" name="notes" defaultValue={values.notes} maxLength={1000} />
      </Field>

      {withPeople ? (
        <section aria-labelledby="people-title" className="flex flex-col gap-3 border-t border-stone-200 dark:border-stone-800 pt-5">
          <div>
            <h2 id="people-title" className="text-base font-semibold text-stone-900 dark:text-stone-100">
              {labels.people.title}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">{labels.people.hint}</p>
          </div>
          {LINE_SLOTS.map(({ slot, type }) => {
            const id = (field: Parameters<typeof personFieldName>[1]) => personFieldName(slot, field);
            return (
              <fieldset key={slot} data-testid={`person-${slot}`} className="rounded-lg border border-stone-200 dark:border-stone-800 p-3">
                <legend className="flex items-center gap-2 px-1 text-sm font-medium text-stone-800 dark:text-stone-200">
                  {labels.line.slot(slot)}
                  <Badge tone={type === "primary" ? "info" : "neutral"}>{LINE_TYPE_LABELS[type]}</Badge>
                </legend>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label={labels.line.holderName} htmlFor={id("holderName")} error={errorFor(id("holderName"))}>
                    <Input id={id("holderName")} name={id("holderName")} defaultValue={values[id("holderName")] ?? ""} aria-invalid={errorFor(id("holderName")) ? true : undefined} maxLength={100} />
                  </Field>
                  <Field label={labels.line.phoneNumber} htmlFor={id("phoneNumber")} error={errorFor(id("phoneNumber"))}>
                    <Input id={id("phoneNumber")} name={id("phoneNumber")} defaultValue={values[id("phoneNumber")] ?? ""} aria-invalid={errorFor(id("phoneNumber")) ? true : undefined} dir="ltr" inputMode="tel" maxLength={30} className="ltr-digits" />
                  </Field>
                  <Field label={labels.line.simReference} htmlFor={id("simReference")} error={errorFor(id("simReference"))}>
                    <Input id={id("simReference")} name={id("simReference")} defaultValue={values[id("simReference")] ?? ""} aria-invalid={errorFor(id("simReference")) ? true : undefined} dir="ltr" inputMode="numeric" maxLength={60} className="ltr-digits" />
                  </Field>
                  <Field label={labels.line.billingCycle} htmlFor={id("billingCycle")} error={errorFor(id("billingCycle"))}>
                    <Select id={id("billingCycle")} name={id("billingCycle")} defaultValue={values[id("billingCycle")] || "monthly"} aria-invalid={errorFor(id("billingCycle")) ? true : undefined}>
                      <option value="monthly">{labels.line.monthly}</option>
                      <option value="yearly">{labels.line.yearly}</option>
                    </Select>
                  </Field>
                </div>
              </fieldset>
            );
          })}
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? labels.package.saving : submitLabel}
        </Button>
        <LinkButton href={cancelHref} variant="ghost">
          {labels.common.cancel}
        </LinkButton>
      </div>
    </form>
  );
}
