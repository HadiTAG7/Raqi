import Link from "next/link";
import { Download, Home, LogOut, PlusCircle } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonClasses } from "@/components/ui/button";
import { isAuthEnabled } from "@/lib/env";
import { APP_NAME, labels } from "@/lib/labels";

export function Nav() {
  return (
    <header className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <Link href="/" className="me-auto flex items-center gap-2 text-lg font-bold text-teal-800 dark:text-teal-300">
          <span className="grid size-8 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">ر</span>
          {APP_NAME}
        </Link>
        <nav aria-label="التنقل الرئيسي" className="order-last flex w-full flex-wrap items-center gap-1 sm:order-none sm:w-auto">
          <Link href="/" className={buttonClasses("ghost", "sm")}>
            <Home className="size-4" aria-hidden />
            {labels.nav.dashboard}
          </Link>
          <Link href="/packages/new" className={buttonClasses("ghost", "sm")}>
            <PlusCircle className="size-4" aria-hidden />
            {labels.nav.newPackage}
          </Link>
          <a href="/api/export" className={buttonClasses("ghost", "sm")}>
            <Download className="size-4" aria-hidden />
            {labels.nav.export}
          </a>
          {isAuthEnabled() ? (
            <form action={logoutAction}>
              <button type="submit" className={buttonClasses("ghost", "sm")}>
                <LogOut className="size-4" aria-hidden />
                {labels.nav.logout}
              </button>
            </form>
          ) : null}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
