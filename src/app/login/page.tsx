import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { sanitizeNextPath } from "@/lib/auth";
import { isAuthEnabled, missingEnv } from "@/lib/env";
import { APP_NAME, APP_TAGLINE, labels } from "@/lib/labels";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: labels.login.title };

// تعتمد الصفحة على متغيرات البيئة وقت التشغيل (هل الحماية مفعّلة؟)،
// فلا يجوز بناؤها بشكل ثابت وقت البناء.
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  if (!isAuthEnabled()) redirect("/");
  const params = await searchParams;
  const next = sanitizeNextPath(Array.isArray(params.next) ? params.next[0] : params.next);
  const missing = missingEnv();

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="text-center">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-teal-700 text-xl font-bold text-white">ر</div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{APP_TAGLINE}</p>
      </div>
      <Card>
        <h2 className="mb-1 text-lg font-semibold">{labels.login.title}</h2>
        <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">{labels.login.subtitle}</p>
        {missing.length > 0 ? (
          <div role="alert" className="mb-4 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-900 dark:text-amber-200">
            <p>{labels.login.notConfigured}</p>
            <ul className="mt-2 list-disc ps-5 font-mono text-xs ltr-digits text-start">
              {missing.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <LoginForm next={next} />
      </Card>
    </main>
  );
}
