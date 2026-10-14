import { LinkButton } from "@/components/ui/button";
import { labels } from "@/lib/labels";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-6xl font-bold text-stone-300 dark:text-stone-700">404</p>
      <h1 className="text-xl font-semibold">{labels.common.notFoundTitle}</h1>
      <p className="text-sm text-stone-600 dark:text-stone-400">{labels.common.notFoundBody}</p>
      <LinkButton href="/" variant="secondary">
        {labels.package.backToList}
      </LinkButton>
    </main>
  );
}
