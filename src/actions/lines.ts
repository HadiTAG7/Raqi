"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateLine } from "@/db/mutations";
import { labels } from "@/lib/labels";
import { requireSession } from "@/lib/session";
import { LINE_FIELDS, lineInputSchema, pickFormFields, type FormState } from "@/lib/validation";

export async function updateLineAction(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const values = pickFormFields(formData, LINE_FIELDS);
  const parsed = lineInputSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const ok = await updateLine(id, parsed.data);
  if (!ok) return { status: "error", formError: labels.errors.generic, values };
  revalidatePath("/", "layout");
  return { status: "success", savedAt: Date.now() };
}
