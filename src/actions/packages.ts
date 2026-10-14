"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createPackage, deletePackage, updatePackage } from "@/db/mutations";
import { labels } from "@/lib/labels";
import { requireSession } from "@/lib/session";
import { LINE_SLOTS } from "@/lib/slots";
import {
  PACKAGE_FIELDS,
  PERSON_FIELDS,
  packageInputSchema,
  parseId,
  personFieldName,
  personRowSchema,
  pickFormFields,
  type FieldErrors,
  type FormState,
  type PersonRow,
} from "@/lib/validation";

export async function createPackageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const values: Record<string, string> = { ...pickFormFields(formData, PACKAGE_FIELDS) };
  const fieldErrors: FieldErrors = {};

  const parsed = packageInputSchema.safeParse(values);
  if (!parsed.success) Object.assign(fieldErrors, z.flattenError(parsed.error).fieldErrors);

  const people: PersonRow[] = [];
  for (const { slot } of LINE_SLOTS) {
    const row: Record<string, string> = {};
    for (const field of PERSON_FIELDS) {
      const name = personFieldName(slot, field);
      const raw = formData.get(name);
      row[field] = typeof raw === "string" ? raw : "";
      values[name] = row[field];
    }
    const person = personRowSchema.safeParse(row);
    if (person.success) {
      people.push({ slot, ...person.data });
    } else {
      for (const [field, messages] of Object.entries(z.flattenError(person.error).fieldErrors)) {
        fieldErrors[`${field}_${slot}`] = messages as string[];
      }
    }
  }

  if (!parsed.success || Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }
  const id = await createPackage(parsed.data, people);
  revalidatePath("/", "layout");
  redirect(`/packages/${id}`);
}

export async function updatePackageAction(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const values = pickFormFields(formData, PACKAGE_FIELDS);
  const parsed = packageInputSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const ok = await updatePackage(id, parsed.data);
  if (!ok) return { status: "error", formError: labels.package.notFound, values };
  revalidatePath("/", "layout");
  redirect(`/packages/${id}`);
}

export async function deletePackageAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = parseId(formData.get("id"));
  if (!id) return;
  await deletePackage(id);
  revalidatePath("/", "layout");
  redirect("/");
}
