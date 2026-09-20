"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createPackage, deletePackage, updatePackage } from "@/db/mutations";
import { labels } from "@/lib/labels";
import { requireSession } from "@/lib/session";
import { PACKAGE_FIELDS, packageInputSchema, parseId, pickFormFields, type FormState } from "@/lib/validation";

export async function createPackageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const values = pickFormFields(formData, PACKAGE_FIELDS);
  const parsed = packageInputSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const id = await createPackage(parsed.data);
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
