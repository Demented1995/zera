import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { MirrorPreviewScreen } from "@/components/catalog/mirror-preview-screen";
import { requireStaffSession } from "@/lib/auth/guards";
import { previewMirrorModelAction } from "@/modules/catalog/preview/actions";
import { loadMirrorPreview } from "@/modules/catalog/preview/service";
import { MODEL_STATUS_LABEL } from "@/modules/catalog/status";

export const metadata = {
  title: "Previzualizare client | ZERA",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ModelPreviewPage({ params }: PageProps) {
  const session = await requireStaffSession();
  const { id } = await params;
  const preview = await loadMirrorPreview({
    modelId: id,
    request: {},
    role: session.user.role,
  });

  if (!preview.ok) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Previzualizare ca client"
        description={`${preview.customer.model.name} · ${MODEL_STATUS_LABEL[preview.customer.model.status]}. Aceeași configurație și aceleași reguli ca în admin. Pagina publică de magazin nu este activă.`}
        actions={
          <Link
            href="/admin/modele"
            className="text-sm underline-offset-2 hover:underline"
          >
            Înapoi la modele
          </Link>
        }
      />
      <MirrorPreviewScreen
        modelId={preview.customer.model.id}
        initial={preview.customer}
        initialDiagnostic={preview.diagnostic}
        quoteAction={previewMirrorModelAction}
      />
    </div>
  );
}
