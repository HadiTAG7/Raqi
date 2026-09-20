import type { ReactNode } from "react";
import { Nav } from "@/components/nav";
import { Card } from "@/components/ui/card";
import { isDbConfigured } from "@/db/client";
import { labels } from "@/lib/labels";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireSession();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {isDbConfigured() ? (
          children
        ) : (
          <Card role="alert" className="border-amber-200 bg-amber-50 text-amber-900">
            <h1 className="mb-2 text-lg font-semibold">{labels.dbNotConfigured.title}</h1>
            <p className="text-sm">{labels.dbNotConfigured.body}</p>
          </Card>
        )}
      </main>
    </div>
  );
}
