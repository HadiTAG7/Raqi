import { z } from "zod";

const authSchema = z.object({
  APP_PASSWORD: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
});

export type AppEnv = z.infer<typeof authSchema>;

type Env = Record<string, string | undefined>;

export class EnvNotConfiguredError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Missing or invalid environment variables: ${missing.join(", ")}`);
    this.name = "EnvNotConfiguredError";
  }
}

/**
 * حماية كلمة المرور اختيارية: تُفعَّل فقط عند ضبط APP_PASSWORD.
 * بدونها يكون التطبيق مفتوحاً لكل من يعرف الرابط.
 */
export function isAuthEnabled(env: Env = process.env): boolean {
  return Boolean(env.APP_PASSWORD?.trim());
}

function parseAuthEnv(env: Env) {
  return authSchema.safeParse({ APP_PASSWORD: env.APP_PASSWORD, AUTH_SECRET: env.AUTH_SECRET });
}

/** أسماء المتغيرات الناقصة أو غير الصالحة عندما تكون الحماية مفعّلة (فارغة إذا كان كل شيء سليماً أو الحماية معطّلة). */
export function missingEnv(env: Env = process.env): string[] {
  if (!isAuthEnabled(env)) return [];
  const result = parseAuthEnv(env);
  if (result.success) return [];
  return Object.keys(z.flattenError(result.error).fieldErrors);
}

export function getEnv(env: Env = process.env): AppEnv {
  const result = parseAuthEnv(env);
  if (!result.success) {
    throw new EnvNotConfiguredError(Object.keys(z.flattenError(result.error).fieldErrors));
  }
  return result.data;
}
