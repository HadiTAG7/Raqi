import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type Db = LibSQLDatabase<typeof schema>;

const store = globalThis as unknown as { __raqiDb?: Db; __raqiClient?: Client };

export class DbNotConfiguredError extends Error {
  constructor() {
    super("TURSO_DATABASE_URL is not set");
    this.name = "DbNotConfiguredError";
  }
}

/**
 * رابط قاعدة البيانات: من TURSO_DATABASE_URL، وإلا ملف محلي في التطوير فقط.
 * في الإنتاج (Vercel) لا نُنشئ قاعدة مؤقتة صامتة أبداً.
 */
export function resolveDatabaseUrl(): string | null {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (url) return url;
  if (process.env.VERCEL || process.env.NODE_ENV === "production") return null;
  return "file:./data/local.db";
}

export function isDbConfigured(): boolean {
  return resolveDatabaseUrl() !== null;
}

export function getDb(): Db {
  if (store.__raqiDb) return store.__raqiDb;
  const url = resolveDatabaseUrl();
  if (!url) throw new DbNotConfiguredError();
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined });
  const db = drizzle(client, { schema });
  store.__raqiClient = client;
  store.__raqiDb = db;
  return db;
}
