/**
 * تواريخ بصيغة نصية ISO (YYYY-MM-DD) فقط. لا نستخدم كائن Date للعرض
 * حتى لا تختلف النتيجة بين الخادم والمتصفح أو تتحول إلى التقويم الهجري.
 */
export type IsoDate = string;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
] as const;

export interface DateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

export function parseIsoDate(value: unknown): DateParts | null {
  if (typeof value !== "string") return null;
  const m = ISO_DATE_RE.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const roundTrip = new Date(Date.UTC(year, month - 1, day));
  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() !== month - 1 ||
    roundTrip.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function isValidIsoDate(value: unknown): value is IsoDate {
  return parseIsoDate(value) !== null;
}

export function toIsoDate({ year, month, day }: DateParts): IsoDate {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** عدد الأيام منذ 1970-01-01 (بالتوقيت العالمي) لتاريخ نصي صالح. */
export function toDayNumber(date: IsoDate): number {
  const parts = parseIsoDate(date);
  if (!parts) throw new Error(`Invalid ISO date: ${date}`);
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000);
}

/** الأيام من `from` إلى `to` (موجب إذا كان `to` لاحقاً). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

/** مثال: "20 سبتمبر 2026" بأرقام لاتينية. */
export function formatIsoDate(date: IsoDate | null | undefined, fallback = "غير محدد"): string {
  const parts = date ? parseIsoDate(date) : null;
  if (!parts) return fallback;
  return `${parts.day} ${ARABIC_MONTHS[parts.month - 1]} ${parts.year}`;
}

/**
 * تاريخ اليوم بتوقيت الرياض. يمكن تثبيته عبر RAQI_TODAY في الاختبارات
 * (يُتجاهل على Vercel حتى لا يُستخدم في الإنتاج بالخطأ).
 */
export function todayRiyadh(now: Date = new Date()): IsoDate {
  const override = process.env.RAQI_TODAY;
  if (override && !process.env.VERCEL && isValidIsoDate(override)) return override;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return toIsoDate({ year: get("year"), month: get("month"), day: get("day") });
}

export type DateStatus = "active" | "ending_soon" | "ended" | "unset";

export const ENDING_SOON_DAYS = 30;

export function dateStatus(end: IsoDate | null | undefined, today: IsoDate): DateStatus {
  if (!end || !isValidIsoDate(end)) return "unset";
  const left = daysBetween(today, end);
  if (left < 0) return "ended";
  if (left <= ENDING_SOON_DAYS) return "ending_soon";
  return "active";
}
