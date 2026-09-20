import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "raqi_session";
export const SESSION_DAYS = 30;
const ISSUER = "raqi";

function signingKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(secret: string): Promise<string> {
  return new SignJWT({ role: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(signingKey(secret));
}

export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  if (!token || secret.length < 32) return false;
  try {
    await jwtVerify(token, signingKey(secret), { issuer: ISSUER, algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return new Uint8Array(digest);
}

/** مقارنة ثابتة الوقت عبر هاش SHA-256 للطرفين. */
export async function passwordMatches(input: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(input), sha256(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

/** يقبل مسارات نسبية داخلية فقط، وإلا يعيد "/". */
export function sanitizeNextPath(next: unknown): string {
  if (typeof next !== "string") return "/";
  const value = next.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.startsWith("/login")) {
    return "/";
  }
  return value;
}
