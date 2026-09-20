import { z } from "zod";
import { isValidIsoDate } from "./dates";
import { labels } from "./labels";

const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const isoDate = z.string().refine(isValidIsoDate, { message: labels.errors.invalidDate });
const optionalIsoDate = z.preprocess(emptyToNull, isoDate.nullable());
const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max, labels.errors.tooLong).nullable());

export const packageInputSchema = z
  .object({
    name: z.string().trim().min(1, labels.errors.required).max(100, labels.errors.tooLong),
    notes: optionalText(1000),
    discountStart: z.string().min(1, labels.errors.required).pipe(isoDate),
    discountEnd: optionalIsoDate,
    cashbackEnd: optionalIsoDate,
  })
  .superRefine((value, ctx) => {
    if (value.discountEnd && value.discountEnd < value.discountStart) {
      ctx.addIssue({ code: "custom", path: ["discountEnd"], message: labels.errors.endBeforeStart });
    }
    if (value.cashbackEnd && value.cashbackEnd < value.discountStart) {
      ctx.addIssue({ code: "custom", path: ["cashbackEnd"], message: labels.errors.endBeforeStart });
    }
  });

export type PackageInput = z.infer<typeof packageInputSchema>;

export const lineInputSchema = z.object({
  holderName: optionalText(100),
  phoneNumber: optionalText(30),
  simReference: optionalText(60),
  billingCycle: z.enum(["monthly", "yearly"]),
  billingStart: optionalIsoDate,
  notes: optionalText(500),
});

export type LineInput = z.infer<typeof lineInputSchema>;

export const PACKAGE_FIELDS = ["name", "notes", "discountStart", "discountEnd", "cashbackEnd"] as const;
export const LINE_FIELDS = ["holderName", "phoneNumber", "simReference", "billingCycle", "billingStart", "notes"] as const;

/** يحوّل FormData إلى كائن نصي للحقول المطلوبة فقط (القيم الناقصة تصبح ""). */
export function pickFormFields<K extends string>(formData: FormData, keys: readonly K[]): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const key of keys) {
    const value = formData.get(key);
    out[key] = typeof value === "string" ? value : "";
  }
  return out;
}

export type FieldErrors = Record<string, string[] | undefined>;

export interface FormState {
  status: "idle" | "error" | "success";
  fieldErrors?: FieldErrors;
  formError?: string;
  values?: Record<string, string>;
  savedAt?: number;
}

export const idleFormState: FormState = { status: "idle" };

export function parseId(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{1,12}$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
