import { asc, eq } from "drizzle-orm";
import { getDb } from "./client";
import { lines, packages, payments, type LineRow, type PackageRow, type PaymentRow } from "./schema";

export type LineWithPayments = LineRow & { payments: PaymentRow[] };
export type PackageWithLines = PackageRow & { lines: LineWithPayments[] };

/** كل الباقات مع شرائحها ومدفوعاتها (البيانات صغيرة: مستخدم واحد). */
export async function getAllPackages(): Promise<PackageWithLines[]> {
  const db = getDb();
  return db.query.packages.findMany({
    orderBy: [asc(packages.createdAt), asc(packages.id)],
    with: {
      lines: {
        orderBy: [asc(lines.slot)],
        with: { payments: { orderBy: [asc(payments.period)] } },
      },
    },
  });
}

export async function getPackageWithLines(id: number): Promise<PackageWithLines | null> {
  const db = getDb();
  const row = await db.query.packages.findFirst({
    where: eq(packages.id, id),
    with: {
      lines: {
        orderBy: [asc(lines.slot)],
        with: { payments: { orderBy: [asc(payments.period)] } },
      },
    },
  });
  return row ?? null;
}

export async function getPackage(id: number): Promise<PackageRow | null> {
  const db = getDb();
  const row = await db.query.packages.findFirst({ where: eq(packages.id, id) });
  return row ?? null;
}

export async function getLine(id: number): Promise<LineRow | null> {
  const db = getDb();
  const row = await db.query.lines.findFirst({ where: eq(lines.id, id) });
  return row ?? null;
}

export async function countPaymentsForPackage(packageId: number): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: payments.id })
    .from(payments)
    .innerJoin(lines, eq(payments.lineId, lines.id))
    .where(eq(lines.packageId, packageId));
  return rows.length;
}
