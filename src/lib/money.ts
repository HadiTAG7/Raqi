/**
 * المبالغ تُخزَّن بالهللات (1 ريال = 100 هللة) كأعداد صحيحة لتجنّب أخطاء الكسور العشرية.
 */
export const CURRENCY_LABEL = "ر.س";

/** أقصى مبلغ مقبول للفاتورة الواحدة: مليون ريال. */
export const MAX_AMOUNT_HALALAS = 100_000_000;

const DIGIT_MAP: Record<string, string> = {};
"٠١٢٣٤٥٦٧٨٩".split("").forEach((d, i) => (DIGIT_MAP[d] = String(i)));
"۰۱۲۳۴۵۶۷۸۹".split("").forEach((d, i) => (DIGIT_MAP[d] = String(i)));

/** يحوّل الأرقام العربية والفارسية والفواصل العربية إلى صيغة لاتينية (1234.56). */
function normalizeAmountText(text: string): string {
  let value = text.trim().replace(/[٠-٩۰-۹]/g, (d) => DIGIT_MAP[d]);
  value = value.replace(/\s|٬/g, "").replace(/٫/g, ".");
  // 1,250 أو 1,250.50: فاصلة آلاف. غير ذلك (57,5): فاصلة عشرية.
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(value)) return value.replace(/,/g, "");
  if (!value.includes(".") && (value.match(/,/g) ?? []).length === 1) return value.replace(",", ".");
  return value;
}

export type ParsedAmount = { ok: true; halalas: number | null } | { ok: false };

/** يحوّل نص المبلغ إلى هللات. النص الفارغ = بدون مبلغ (null). */
export function parseAmount(input: unknown): ParsedAmount {
  if (input == null) return { ok: true, halalas: null };
  if (typeof input !== "string") return { ok: false };
  if (input.trim() === "") return { ok: true, halalas: null };
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(normalizeAmountText(input));
  if (!match) return { ok: false };
  const halalas = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (halalas > MAX_AMOUNT_HALALAS) return { ok: false };
  return { ok: true, halalas };
}

/** 125050 ← "1,250.50"، 5000 ← "50" (بأرقام لاتينية). */
export function formatAmountNumber(halalas: number): string {
  const whole = Math.floor(halalas / 100);
  const fraction = halalas % 100;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === 0 ? grouped : `${grouped}.${String(fraction).padStart(2, "0")}`;
}

/** مثال: "150 ر.س". */
export function formatAmount(halalas: number): string {
  return `${formatAmountNumber(halalas)} ${CURRENCY_LABEL}`;
}

/** قيمة حقل الإدخال لمبلغ مخزّن: 5750 ← "57.5"، 5000 ← "50"، null ← "". */
export function amountToInput(halalas: number | null | undefined): string {
  if (halalas == null) return "";
  const whole = Math.floor(halalas / 100);
  const fraction = halalas % 100;
  if (fraction === 0) return String(whole);
  return `${whole}.${String(fraction).padStart(2, "0").replace(/0$/, "")}`;
}
