import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import { isAuthEnabled } from "./env";

/** هل يحمل الطلب الحالي كوكي جلسة صالحاً؟ (دائماً نعم عندما تكون الحماية معطّلة) */
export async function hasValidSession(): Promise<boolean> {
  if (!isAuthEnabled()) return true;
  const secret = process.env.AUTH_SECRET ?? "";
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token, secret);
}

/** يُستدعى في كل Server Action وفي layout المنطقة المحمية. */
export async function requireSession(): Promise<void> {
  if (!(await hasValidSession())) redirect("/login");
}
