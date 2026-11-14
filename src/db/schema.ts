import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const nowIso = () => new Date().toISOString();

export const packages = sqliteTable("packages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  notes: text("notes"),
  /** تاريخ تفعيل الخصم (YYYY-MM-DD) */
  discountStart: text("discount_start").notNull(),
  /** تاريخ نهاية الخصم (YYYY-MM-DD)، يُحسب من تاريخ التفعيل + المدة المختارة */
  discountEnd: text("discount_end"),
  /** تاريخ تفعيل الكاش باك (YYYY-MM-DD) */
  cashbackStart: text("cashback_start"),
  /** تاريخ نهاية الكاش باك (YYYY-MM-DD)، يُحسب من تاريخ تفعيله + المدة المختارة */
  cashbackEnd: text("cashback_end"),
  createdAt: text("created_at").notNull().$defaultFn(nowIso),
  updatedAt: text("updated_at").notNull().$defaultFn(nowIso),
});

export const lines = sqliteTable(
  "lines",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    packageId: integer("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    /** ترتيب الشريحة داخل الباقة 1..5 */
    slot: integer("slot").notNull(),
    type: text("type", { enum: ["primary", "international", "local"] }).notNull(),
    holderName: text("holder_name"),
    phoneNumber: text("phone_number"),
    simReference: text("sim_reference"),
    /** دورة الفاتورة؛ free = شريحة مجانية بلا فواتير */
    billingCycle: text("billing_cycle", { enum: ["monthly", "yearly", "free"] }).notNull().default("monthly"),
    /** مبلغ الفاتورة الواحدة بالهللات (1 ريال = 100 هللة)؛ فارغ = غير محدد */
    amountHalalas: integer("amount_halalas"),
    /** بداية الفوترة (YYYY-MM-DD)؛ إن كانت فارغة يُستخدم discount_start للباقة */
    billingStart: text("billing_start"),
    notes: text("notes"),
  },
  (t) => [
    uniqueIndex("lines_package_slot_idx").on(t.packageId, t.slot),
    index("lines_package_idx").on(t.packageId),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    lineId: integer("line_id")
      .notNull()
      .references(() => lines.id, { onDelete: "cascade" }),
    /** "YYYY-MM" للشهري أو "YYYY" للسنوي؛ وجود الصف يعني أن الفترة مدفوعة */
    period: text("period").notNull(),
    paidAt: text("paid_at").notNull().$defaultFn(nowIso),
  },
  (t) => [
    uniqueIndex("payments_line_period_idx").on(t.lineId, t.period),
    index("payments_line_idx").on(t.lineId),
  ],
);

export const packagesRelations = relations(packages, ({ many }) => ({
  lines: many(lines),
}));

export const linesRelations = relations(lines, ({ one, many }) => ({
  package: one(packages, { fields: [lines.packageId], references: [packages.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  line: one(lines, { fields: [payments.lineId], references: [lines.id] }),
}));

export type PackageRow = typeof packages.$inferSelect;
export type LineRow = typeof lines.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;
