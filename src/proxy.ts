import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * بوابة المصادقة: كل المسارات محمية ما عدا /login والملفات الثابتة.
 * عندما لا يكون APP_PASSWORD مضبوطاً تكون الحماية معطّلة ويُمرَّر كل شيء.
 * التحقق يُعاد أيضاً داخل كل Server Action عبر requireSession().
 *
 * ملاحظة: حزمة proxy ترى فقط متغيرات البيئة المذكورة بشكل صريح
 * (process.env.NAME)، لذلك لا نستخدم isAuthEnabled() من lib/env هنا.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const authEnabled = Boolean(process.env.APP_PASSWORD?.trim());

  if (!authEnabled) {
    return pathname === "/login" ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET ?? "";
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const authenticated = token.length > 0 && (await verifySessionToken(token, secret));

  if (pathname === "/login") {
    return authenticated ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  if (!authenticated) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt)$).*)"],
};
