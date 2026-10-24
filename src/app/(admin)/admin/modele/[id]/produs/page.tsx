import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProductPreviewScreen } from "@/components/catalog/product-preview-screen";
import { auth } from "@/lib/auth";
import { requireStaffSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { canViewCatalog } from "@/modules/catalog/permissions";
import { previewProductPageAction } from "@/modules/catalog/preview/actions";
import { placeOrderAction } from "@/modules/orders/actions";
import { loadProductPage } from "@/modules/catalog/preview/service";
import { MODEL_STATUS_LABEL } from "@/modules/catalog/status";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return {
      title: "Previzualizare produs",
      robots: { index: false, follow: false },
    };
  }

  const { id } = await params;
  const model = await prisma.mirrorModel.findUnique({
    where: { id },
    select: { name: true, seoTitle: true, seoDescription: true },
  });
  return {
    title: model?.seoTitle?.trim() || model?.name || "Previzualizare produs",
    description: model?.seoDescription?.trim() || undefined,
    robots: { index: false, follow: false },
  };
}

export default async function ProductPreviewPage({ params }: PageProps) {
  const session = await requireStaffSession();
  if (!canViewCatalog(session.user.role)) {
    redirect("/admin");
  }

  const { id } = await params;
  const page = await loadProductPage({
    modelId: id,
    request: {},
    role: session.user.role,
  });
  if (!page.found) {
    notFound();
  }

  const seo = page.customer.productCopy?.seo;

  return (
    <div className="space-y-8">
      <aside className="space-y-3 rounded-xl border border-border bg-muted/40 px-4 py-4 text-sm">
        <p>
          Previzualizare internă. Formularul de mai jos înregistrează o comandă reală în
          administrare, fără cont de client.
        </p>
        <p className="text-muted-foreground">
          {page.customer.model.code} · {MODEL_STATUS_LABEL[page.customer.model.status]} · publicat:{" "}
          {page.published ? "da" : "nu"}
          {seo?.slug ? ` · /${seo.slug}` : ""}
        </p>
        {seo?.title ? <p>Titlu SEO: {seo.title}</p> : null}
        {seo?.description ? <p>Meta description: {seo.description}</p> : null}
        <div className="flex flex-wrap gap-4">
          <Link href="/admin/modele" className="underline-offset-2 hover:underline">
            Înapoi la modele
          </Link>
          <Link
            href={`/admin/modele/${id}/descriere`}
            className="underline-offset-2 hover:underline"
          >
            Descriere
          </Link>
          <Link
            href={`/admin/modele/${id}/fotografii`}
            className="underline-offset-2 hover:underline"
          >
            Fotografii
          </Link>
          <Link
            href={`/admin/modele/${id}/previzualizare`}
            className="underline-offset-2 hover:underline"
          >
            Configurator
          </Link>
        </div>
      </aside>
      <ProductPreviewScreen
        modelId={page.customer.model.id}
        initial={page.customer}
        quoteAction={previewProductPageAction}
        placeOrder={placeOrderAction}
        orderContextNote="Comanda se salvează în administrare, fără cont de client."
      />
    </div>
  );
}
