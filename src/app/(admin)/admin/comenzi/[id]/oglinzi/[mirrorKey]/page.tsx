import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { MirrorPlacementForm } from "@/components/orders/mirror-placement-form";
import { MirrorStatusSelect } from "@/components/orders/mirror-status-select";
import { OrderMirrorEditor } from "@/components/orders/order-mirror-editor";
import { RemoveOrderMirror } from "@/components/orders/remove-order-mirror";
import { getConfiguratorLayout } from "@/modules/configurator/layout-store";
import { requireStaffSession } from "@/lib/auth/guards";
import { canManageOrders } from "@/modules/orders/permissions";
import { getOrderMirror } from "@/modules/orders/queries";
import { formatMdl } from "@/modules/orders/public";

export const metadata = {
  title: "Oglindă",
};

type PageProps = {
  params: Promise<{ id: string; mirrorKey: string }>;
};

export default async function OglindaComenziiPage({ params }: PageProps) {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    redirect("/admin");
  }
  const { id, mirrorKey } = await params;
  const [mirror, sections] = await Promise.all([
    getOrderMirror(id, mirrorKey),
    getConfiguratorLayout(),
  ]);
  if (!mirror) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${mirror.code} · ${mirror.modelName}`}
        description={`${mirror.customerName} · ${mirror.customerPhone} · ${formatMdl(mirror.price)}`}
        actions={
          <Link
            href={`/admin/comenzi/${mirror.orderId}`}
            className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm hover:bg-muted"
          >
            Înapoi la comandă
          </Link>
        }
      />
      <MirrorStatusSelect orderId={mirror.orderId} mirrorKey={mirror.mirrorKey} status={mirror.mirrorStatus} />
      {mirror.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mirror.photoUrl}
          alt={mirror.modelName}
          className="max-h-80 max-w-full rounded-xl border border-border object-contain"
        />
      ) : (
        <p className="rounded-xl border border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
          Modelul nu are fotografie.
        </p>
      )}
      <section className="overflow-hidden rounded-xl border border-border">
        <h2 className="bg-[#111111] px-4 py-2 text-sm font-medium tracking-wide text-white uppercase">
          Amplasare
        </h2>
        <MirrorPlacementForm
          key={`${mirror.placement.touchVertical}-${mirror.placement.touchHorizontal}-${mirror.placement.sandblastGapMm}-${mirror.placement.sandblastThicknessMm}`}
          orderId={mirror.orderId}
          mirrorKey={mirror.mirrorKey}
          placement={mirror.placement}
        />
      </section>
      {mirror.config ? (
        <OrderMirrorEditor
          key={mirror.updatedAt}
          orderId={mirror.orderId}
          mirrorKey={mirror.mirrorKey}
          initialState={mirror.config}
          sections={sections}
          canEditTariffs={session.user.role === "ADMIN"}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Configurația salvată nu poate fi editată.</p>
      )}
      {mirror.canRemove ? (
        <RemoveOrderMirror orderId={mirror.orderId} mirrorKey={mirror.mirrorKey} modelName={mirror.modelName} />
      ) : null}
    </div>
  );
}
