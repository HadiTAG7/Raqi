// يطبّق ملفات الهجرة في ./drizzle على قاعدة البيانات.
// - محلياً: TURSO_DATABASE_URL أو الملف الافتراضي file:./data/local.db
// - على Vercel: يتخطى مع تحذير إن لم تكن قاعدة Turso مضبوطة بعد، حتى ينجح النشر الأول.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const explicit = process.env.TURSO_DATABASE_URL?.trim();
const isHosted = Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";
const url = explicit || (isHosted ? "" : "file:./data/local.db");

if (!url) {
  console.warn("[migrate] TURSO_DATABASE_URL غير مضبوط؛ تم تخطي الهجرات. أضف قاعدة Turso ثم أعد النشر.");
  process.exit(0);
}

if (url.startsWith("file:")) {
  const path = url.slice("file:".length).replace(/^\/\//, "");
  if (path && path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
}

const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined });
const db = drizzle(client);

try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log(`[migrate] تم تطبيق الهجرات على ${url.startsWith("file:") ? url : "قاعدة Turso البعيدة"}`);
} finally {
  client.close();
}
