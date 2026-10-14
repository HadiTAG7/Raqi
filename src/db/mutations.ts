import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "./client";
import { lines, packages, payments } from "./schema";
import { LINE_SLOTS } from "@/lib/slots";
import type { LineInput, PackageInput, PersonRow } from "@/lib/validation";

/**
 * ينشئ الباقة مع شرائحها الخمس في معاملة واحدة ويعيد معرّفها.
 * `people` اختياري: بيانات صاحب كل شريحة حسب رقمها (slot).
 */
export async function createPackage(input: PackageInput, people: PersonRow[] = []): Promise<number> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(packages)
      .values({
        name: input.name,
        notes: input.notes,
        discountStart: input.discountStart,
        discountEnd: input.discountEnd,
        cashbackEnd: input.cashbackEnd,
      })
      .returning({ id: packages.id });
    const bySlot = new Map(people.map((p) => [p.slot, p]));
    await tx.insert(lines).values(
      LINE_SLOTS.map(({ slot, type }) => {
        const person = bySlot.get(slot);
        return {
          packageId: created.id,
          slot,
          type,
          holderName: person?.holderName ?? null,
          phoneNumber: person?.phoneNumber ?? null,
          simReference: person?.simReference ?? null,
          billingCycle: person?.billingCycle ?? "monthly",
        };
      }),
    );
    return created.id;
  });
}

export async function updatePackage(id: number, input: PackageInput): Promise<boolean> {
  const db = getDb();
  const updated = await db
    .update(packages)
    .set({
      name: input.name,
      notes: input.notes,
      discountStart: input.discountStart,
      discountEnd: input.discountEnd,
      cashbackEnd: input.cashbackEnd,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(packages.id, id))
    .returning({ id: packages.id });
  return updated.length > 0;
}

/**
 * يحذف الباقة وشرائحها ومدفوعاتها صراحةً في دفعة واحدة
 * (لا نعتمد على ON DELETE CASCADE لأن PRAGMA foreign_keys غير مضمون).
 */
export async function deletePackage(id: number): Promise<boolean> {
  const db = getDb();
  const lineRows = await db.select({ id: lines.id }).from(lines).where(eq(lines.packageId, id));
  const lineIds = lineRows.map((r) => r.id);
  const deletePackageStmt = db.delete(packages).where(eq(packages.id, id)).returning({ id: packages.id });
  if (lineIds.length === 0) {
    const deleted = await deletePackageStmt;
    return deleted.length > 0;
  }
  const [, , deleted] = await db.batch([
    db.delete(payments).where(inArray(payments.lineId, lineIds)),
    db.delete(lines).where(eq(lines.packageId, id)),
    deletePackageStmt,
  ]);
  return deleted.length > 0;
}

export async function updateLine(id: number, input: LineInput): Promise<boolean> {
  const db = getDb();
  const updated = await db
    .update(lines)
    .set({
      holderName: input.holderName,
      phoneNumber: input.phoneNumber,
      simReference: input.simReference,
      billingCycle: input.billingCycle,
      billingStart: input.billingStart,
      notes: input.notes,
    })
    .where(eq(lines.id, id))
    .returning({ id: lines.id });
  return updated.length > 0;
}

/** يبدّل حالة الدفع لفترة معينة ويعيد الحالة الجديدة. */
export async function togglePayment(lineId: number, period: string): Promise<{ paid: boolean }> {
  const db = getDb();
  const existing = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.lineId, lineId), eq(payments.period, period)));
  if (existing.length > 0) {
    await db.delete(payments).where(and(eq(payments.lineId, lineId), eq(payments.period, period)));
    return { paid: false };
  }
  await db.insert(payments).values({ lineId, period }).onConflictDoNothing();
  return { paid: true };
}
