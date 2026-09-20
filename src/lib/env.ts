import { z } from "zod";

const envSchema = z.object({
  APP_PASSWORD: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
});

export type AppEnv = z.infer<typeof envSchema>;

export class EnvNotConfiguredError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Missing or invalid environment variables: ${missing.join(", ")}`);
    this.name = "EnvNotConfiguredError";
  }
}

/** أسماء المتغيرات الناقصة أو غير الصالحة (مصفوفة فارغة إذا كان كل شيء سليماً). */
export function missingEnv(): string[] {
  const result = envSchema.safeParse({
    APP_PASSWORD: process.env.APP_PASSWORD,
    AUTH_SECRET: process.env.AUTH_SECRET,
  });
  if (result.success) return [];
  const fields = z.flattenError(result.error).fieldErrors;
  return Object.keys(fields);
}

export function getEnv(): AppEnv {
  const result = envSchema.safeParse({
    APP_PASSWORD: process.env.APP_PASSWORD,
    AUTH_SECRET: process.env.AUTH_SECRET,
  });
  if (!result.success) {
    throw new EnvNotConfiguredError(Object.keys(z.flattenError(result.error).fieldErrors));
  }
  return result.data;
}
