"use client";

import { useActionState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { labels } from "@/lib/labels";
import { idleFormState, type FormState } from "@/lib/validation";

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
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: PackageFormValues;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleFormState);
  const values = { ...initial, ...(state.values ?? {}) };
  const errorFor = (field: keyof PackageFormValues) => state.fieldErrors?.[field]?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.formError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
