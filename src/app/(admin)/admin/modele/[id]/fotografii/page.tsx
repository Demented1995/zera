import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { ModelGallery } from "@/components/catalog/model-gallery";
import { requireStaffSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { listModelImages } from "@/modules/catalog/images/service";
import {
  canManageModelImages,
  canViewModelImages,
} from "@/modules/catalog/permissions";
import { getMirrorModel } from "@/modules/catalog/queries";

export const metadata = {
  title: "Fotografii model",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ModelPhotosPage({ params }: PageProps) {
  const session = await requireStaffSession();
  if (!canViewModelImages(session.user.role)) {
    notFound();
  }
  const { id } = await params;
  const model = await getMirrorModel(id);
  if (!model) {
    notFound();
  }
  const images = await listModelImages(prisma, id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fotografii"
        description={model.name}
        actions={
          <Link
            href="/admin/modele"
            className="text-sm underline-offset-2 hover:underline"
          >
            Înapoi la modele
          </Link>
        }
      />
      <ModelGallery
        modelId={model.id}
        initialImages={images}
        canManage={canManageModelImages(session.user.role)}
      />
    </div>
  );
}
