import { defineConfig } from "drizzle-kit";

// يُستخدم لتوليد ملفات الهجرة فقط (npm run db:generate).
// تطبيق الهجرات يتم عبر scripts/migrate.mjs محلياً ووقت البناء على Vercel.
export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:./data/local.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
