import type { HTMLAttributes, ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-xs", className)} {...props} />;
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("mb-4 flex flex-wrap items-start justify-between gap-3", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cx("text-base font-semibold text-stone-900 dark:text-stone-100", className)}>{children}</h2>;
}
