import type { Metadata } from "next";
import { createPackageAction } from "@/actions/packages";
import { PackageForm } from "@/components/package-form";
import { Card } from "@/components/ui/card";
import { labels } from "@/lib/labels";

export const metadata: Metadata = { title: labels.package.new };

export default function NewPackagePage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <h1 className="text-2xl font-bold">{labels.package.new}</h1>
      <Card>
        <PackageForm action={createPackageAction} submitLabel={labels.package.create} cancelHref="/" withPeople />
      </Card>
    </div>
  );
}
