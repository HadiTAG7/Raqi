import Link from "next/link";
import { Download, Home, LogOut, PlusCircle } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { buttonClasses } from "@/components/ui/button";
import { APP_NAME, labels } from "@/lib/labels";

export function Nav() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-teal-800">
          <span className="grid size-8 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">ر</span>
          {APP_NAME}
        </Link>
        <nav aria-label="التنقل الرئيسي" className="flex flex-wrap items-center gap-1">
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
          <form action={logoutAction}>
            <button type="submit" className={buttonClasses("ghost", "sm")}>
              <LogOut className="size-4" aria-hidden />
              {labels.nav.logout}
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
