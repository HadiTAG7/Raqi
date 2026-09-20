"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  createSessionToken,
  passwordMatches,
  sanitizeNextPath,
  sessionCookieOptions,
} from "@/lib/auth";
import { EnvNotConfiguredError, getEnv } from "@/lib/env";
import { labels } from "@/lib/labels";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = sanitizeNextPath(formData.get("next"));

  let env;
  try {
    env = getEnv();
  } catch (error) {
    if (error instanceof EnvNotConfiguredError) {
      return { error: `${labels.login.notConfigured} ${error.missing.join(", ")}` };
    }
    throw error;
  }

  if (!(await passwordMatches(password, env.APP_PASSWORD))) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { error: labels.login.wrongPassword };
  }

  const token = await createSessionToken(env.AUTH_SECRET);
  const proto = (await headers()).get("x-forwarded-proto");
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(proto === "https"));
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
