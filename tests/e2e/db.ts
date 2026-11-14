import { createClient } from "@libsql/client";
import { E2E_ENV } from "../../playwright.config";
import { LINE_SLOTS } from "../../src/lib/slots";

/**
 * يُدرج باقة مباشرة في قاعدة الاختبار بتواريخ نهاية يدوية (كما كانت تُحفظ قبل حساب النهاية من المدة)،
 * لأن الواجهة لم تعد تسمح بإدخال تاريخ نهاية حر.
 */
export async function insertLegacyPackage(input: {
  name: string;
  discountStart: string;
  discountEnd: string | null;
  cashbackEnd: string | null;
}): Promise<number> {
  const client = createClient({ url: E2E_ENV.TURSO_DATABASE_URL });
  try {
    const now = new Date().toISOString();
    const result = await client.execute({
      sql: "INSERT INTO packages (name, discount_start, discount_end, cashback_end, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
      args: [input.name, input.discountStart, input.discountEnd, input.cashbackEnd, now, now],
    });
    const id = Number(result.rows[0].id);
    await client.batch(
      LINE_SLOTS.map(({ slot, type }) => ({
        sql: "INSERT INTO lines (package_id, slot, type, billing_cycle) VALUES (?, ?, ?, 'monthly')",
        args: [id, slot, type],
      })),
      "write",
    );
    return id;
  } finally {
    client.close();
  }
}
