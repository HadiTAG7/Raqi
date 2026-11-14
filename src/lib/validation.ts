import { z } from "zod";
import { addMonths, durationFromDates, isValidIsoDate } from "./dates";
import { labels } from "./labels";
import { parseAmount } from "./money";
import { LINE_CYCLES, type LineCycle } from "./periods";

const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const isoDate = z.string().refine(isValidIsoDate, { message: labels.errors.invalidDate });
const optionalIsoDate = z.preprocess(emptyToNull, isoDate.nullable());
const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max, labels.errors.tooLong).nullable());

/** قيمة قائمة المدة في النموذج: فارغة = غير محدد، أو عدد الأشهر، أو keep = الإبقاء على تاريخ قديم. */
export const DURATION_FIELD_VALUES = ["", "3", "6", "12", "keep"] as const;
export type DurationFieldValue = (typeof DURATION_FIELD_VALUES)[number];

const durationField = z.enum(DURATION_FIELD_VALUES, { error: labels.errors.invalidDuration });

/** ما يرسله نموذج الباقة: تواريخ التفعيل والمدد، وتواريخ النهاية تُحسب على الخادم. */
export const packageFormSchema = z.object({
  name: z.string().trim().min(1, labels.errors.required).max(100, labels.errors.tooLong),
  notes: optionalText(1000),
  discountStart: z.string().min(1, labels.errors.required).pipe(isoDate),
  discountDuration: durationField,
  cashbackStart: optionalIsoDate,
  cashbackDuration: durationField,
  billCycle: z.preprocess((v) => (v === "" || v == null ? "monthly" : v), z.enum(["monthly", "yearly"])),
});

export type PackageFormInput = z.infer<typeof packageFormSchema>;

/** ما يُحفظ في قاعدة البيانات. */
export interface PackageInput {
  name: string;
  notes: string | null;
  discountStart: string;
  discountEnd: string | null;
  cashbackStart: string | null;
  cashbackEnd: string | null;
  /** دورة فاتورة الباقة التي تطلبها الشركة */
  billCycle: "monthly" | "yearly";
}

/** تواريخ النهاية المخزّنة حالياً (للتعديل فقط)، يحتاجها خيار "الإبقاء على التاريخ الحالي". */
export interface ExistingPackageEnds {
  discountEnd: string | null;
  cashbackEnd: string | null;
}

export type PackageParseResult = { ok: true; data: PackageInput } | { ok: false; fieldErrors: FieldErrors };

/** يحسب تواريخ النهاية من تواريخ التفعيل والمدد المختارة. */
export function resolvePackageDates(form: PackageFormInput, existing?: ExistingPackageEnds | null): PackageParseResult {
  const fieldErrors: FieldErrors = {};

  let discountEnd: string | null = null;
  if (form.discountDuration === "keep") {
    if (!existing?.discountEnd) fieldErrors.discountDuration = [labels.errors.invalidDuration];
    else if (existing.discountEnd < form.discountStart) fieldErrors.discountDuration = [labels.errors.keepEndBeforeStart];
    else discountEnd = existing.discountEnd;
  } else if (form.discountDuration !== "") {
    discountEnd = addMonths(form.discountStart, Number(form.discountDuration));
  }

  let cashbackEnd: string | null = null;
  if (form.cashbackDuration === "keep") {
    if (!existing?.cashbackEnd) fieldErrors.cashbackDuration = [labels.errors.invalidDuration];
    else if (form.cashbackStart && existing.cashbackEnd < form.cashbackStart) fieldErrors.cashbackDuration = [labels.errors.keepEndBeforeStart];
    else cashbackEnd = existing.cashbackEnd;
  } else if (form.cashbackDuration !== "") {
    if (!form.cashbackStart) fieldErrors.cashbackStart = [labels.errors.cashbackStartRequired];
    else cashbackEnd = addMonths(form.cashbackStart, Number(form.cashbackDuration));
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return {
    ok: true,
    data: {
      name: form.name,
      notes: form.notes,
      discountStart: form.discountStart,
      discountEnd,
      cashbackStart: form.cashbackStart,
      cashbackEnd,
      billCycle: form.billCycle,
    },
  };
}

/** يتحقق من قيم النموذج ثم يحسب تواريخ النهاية. */
export function parsePackageForm(values: Record<string, string>, existing?: ExistingPackageEnds | null): PackageParseResult {
  const parsed = packageFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  return resolvePackageDates(parsed.data, existing);
}

/** قيم حقول نموذج الباقة كنصوص. */
export interface PackageFormValues {
  name: string;
  notes: string;
  discountStart: string;
  discountDuration: string;
  cashbackStart: string;
  cashbackDuration: string;
  billCycle: string;
}

function durationFieldFor(start: string | null, end: string | null): DurationFieldValue {
  if (!end) return "";
  const months = durationFromDates(start, end);
  return months ? (String(months) as DurationFieldValue) : "keep";
}

/** القيم الأولية لنموذج تعديل باقة موجودة: المدة تُستنتج من التاريخين، والتواريخ القديمة اليدوية تصبح keep. */
export function packageFormInitial(pkg: {
  name: string;
  notes: string | null;
  discountStart: string;
  discountEnd: string | null;
  cashbackStart: string | null;
  cashbackEnd: string | null;
  billCycle: string;
}): PackageFormValues {
  return {
    name: pkg.name,
    notes: pkg.notes ?? "",
    discountStart: pkg.discountStart,
    discountDuration: durationFieldFor(pkg.discountStart, pkg.discountEnd),
    cashbackStart: pkg.cashbackStart ?? "",
    cashbackDuration: durationFieldFor(pkg.cashbackStart, pkg.cashbackEnd),
    billCycle: pkg.billCycle,
  };
}

/** نص المبلغ ← هللات (أو null إن تُرك فارغاً). */
const amountField = z
  .string()
  .refine((value) => parseAmount(value).ok, { message: labels.errors.invalidAmount })
  .transform((value) => {
    const parsed = parseAmount(value);
    return parsed.ok ? parsed.halalas : null;
  });

/** الشريحة المجانية لا مبلغ عليها مهما أُرسل في الحقل. */
function clearAmountWhenFree<T extends { billingCycle: LineCycle; amount: number | null }>(line: T): T {
  return line.billingCycle === "free" ? { ...line, amount: null } : line;
}

export const lineInputSchema = z
  .object({
    holderName: optionalText(100),
    phoneNumber: optionalText(30),
    simReference: optionalText(60),
    billingCycle: z.enum(LINE_CYCLES),
    amount: amountField,
    billingStart: optionalIsoDate,
    notes: optionalText(500),
  })
  .transform(clearAmountWhenFree);

export type LineInput = z.infer<typeof lineInputSchema>;

/** بيانات الشخص (صاحب الشريحة) التي تُسجَّل مع إنشاء الباقة. */
export const personRowSchema = z
  .object({
    holderName: optionalText(100),
    phoneNumber: optionalText(30),
    simReference: optionalText(60),
    billingCycle: z.preprocess((v) => (v === "" || v == null ? "monthly" : v), z.enum(LINE_CYCLES)),
    amount: amountField,
  })
  .transform(clearAmountWhenFree);

export type PersonRow = z.infer<typeof personRowSchema> & { slot: number };

export const PERSON_FIELDS = ["holderName", "phoneNumber", "simReference", "billingCycle", "amount"] as const;
export type PersonField = (typeof PERSON_FIELDS)[number];

/** اسم حقل النموذج لشخص في شريحة معيّنة، مثل holderName_1 */
export function personFieldName(slot: number, field: PersonField): string {
  return `${field}_${slot}`;
}

export const PACKAGE_FIELDS = ["name", "notes", "discountStart", "discountDuration", "cashbackStart", "cashbackDuration", "billCycle"] as const;
export const LINE_FIELDS = ["holderName", "phoneNumber", "simReference", "billingCycle", "amount", "billingStart", "notes"] as const;

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
