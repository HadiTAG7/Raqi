import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updatePackageAction } from "@/actions/packages";
import { PackageForm } from "@/components/package-form";
import { Card } from "@/components/ui/card";
import { getPackage } from "@/db/queries";
import { labels } from "@/lib/labels";
import { parseId } from "@/lib/validation";

export const metadata: Metadata = { title: labels.package.edit };

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const pkg = await getPackage(id);
  if (!pkg) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold">
        {labels.package.edit}: {pkg.name}
      </h1>
      <Card>
        <PackageForm
          action={updatePackageAction.bind(null, pkg.id)}
          initial={{
            name: pkg.name,
            notes: pkg.notes ?? "",
            discountStart: pkg.discountStart,
            discountEnd: pkg.discountEnd ?? "",
            cashbackEnd: pkg.cashbackEnd ?? "",
          }}
          submitLabel={labels.package.save}
          cancelHref={`/packages/${pkg.id}`}
        />
      </Card>
    </div>
  );
}
