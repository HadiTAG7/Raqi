import { parseIsoDate, type IsoDate, ARABIC_MONTHS } from "./dates";

export type BillingCycle = "monthly" | "yearly";

const MONTHLY_RE = /^(\d{4})-(\d{2})$/;
const YEARLY_RE = /^(\d{4})$/;

/** الفترة التي يقع فيها التاريخ: "2026-09" للشهري أو "2026" للسنوي. */
export function periodForDate(date: IsoDate, cycle: BillingCycle): string {
  const parts = parseIsoDate(date);
  if (!parts) throw new Error(`Invalid ISO date: ${date}`);
  const year = String(parts.year).padStart(4, "0");
  return cycle === "monthly" ? `${year}-${String(parts.month).padStart(2, "0")}` : year;
}

export function isValidPeriod(period: unknown, cycle: BillingCycle): period is string {
  if (typeof period !== "string") return false;
  if (cycle === "monthly") {
    const m = MONTHLY_RE.exec(period);
    if (!m) return false;
    const month = Number(m[2]);
    return month >= 1 && month <= 12;
  }
  return YEARLY_RE.test(period);
}

/**
 * كل الفترات من تاريخ البداية إلى تاريخ النهاية (شاملة) تصاعدياً.
 * تُعيد مصفوفة فارغة إذا كانت البداية بعد النهاية.
 */
export function periodsBetween(start: IsoDate, end: IsoDate, cycle: BillingCycle): string[] {
  const s = parseIsoDate(start);
  const e = parseIsoDate(end);
  if (!s || !e) throw new Error("Invalid ISO date range");
  const result: string[] = [];
  if (cycle === "monthly") {
    const from = s.year * 12 + (s.month - 1);
    const to = e.year * 12 + (e.month - 1);
    for (let i = from; i <= to; i++) {
      const year = Math.floor(i / 12);
      const month = (i % 12) + 1;
      result.push(`${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`);
    }
  } else {
    for (let y = s.year; y <= e.year; y++) result.push(String(y).padStart(4, "0"));
  }
  return result;
}

/** "سبتمبر 2026" أو "2026". */
export function formatPeriod(period: string, cycle: BillingCycle): string {
  if (cycle === "monthly") {
    const m = MONTHLY_RE.exec(period);
    if (m) return `${ARABIC_MONTHS[Number(m[2]) - 1]} ${Number(m[1])}`;
  }
  return period;
}

/** ترتيب نصي كافٍ لأن الفترات مبطّنة بالأصفار. */
export function comparePeriods(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
