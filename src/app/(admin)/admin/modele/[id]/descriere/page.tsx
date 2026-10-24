import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { ModelContentForm } from "@/components/catalog/model-content-form";
import { requireStaffSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { snapshotModelContent } from "@/modules/catalog/content/service";
import { derivePublicSpecifications } from "@/modules/catalog/content/specs";
import {
  canManageModelContent,
  canViewModelContent,
} from "@/modules/catalog/permissions";
import { getMirrorModel } from "@/modules/catalog/queries";
import { MODEL_STATUS_LABEL } from "@/modules/catalog/status";

export const metadata = {
  title: "Descriere și specificații",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ModelContentPage({ params }: PageProps) {
  const session = await requireStaffSession();
  if (!canViewModelContent(session.user.role)) {
    notFound();
  }
  const { id } = await params;
  const model = await getMirrorModel(id);
  if (!model) {
    notFound();
  }
  const primary = await prisma.mirrorModelImage.findFirst({
    where: { modelId: model.id, isPrimary: true },
    select: { id: true, altText: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Descriere și specificații"
        description={model.name}
        actions={
          <Link href="/admin/modele" className="text-sm underline-offset-2 hover:underline">
            Înapoi la modele
          </Link>
        }
      />
      <ModelContentForm
        modelId={model.id}
        canManage={canManageModelContent(session.user.role)}
        code={model.code}
        statusLabel={MODEL_STATUS_LABEL[model.status]}
        specs={derivePublicSpecifications({
          configJson: model.configJson,
          rulesJson: model.configuratorRulesJson,
        })}
        initial={snapshotModelContent(model, primary)}
      />
    </div>
  );
}
