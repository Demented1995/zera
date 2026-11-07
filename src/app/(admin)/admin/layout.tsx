import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaffSession } from "@/lib/auth/guards";
import { countUnopenedSiteRequests } from "@/modules/orders/queries";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaffSession();
  const unopenedRequests = await countUnopenedSiteRequests();

  return (
    <AdminShell
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
      unopenedRequests={unopenedRequests}
    >
      {children}
    </AdminShell>
  );
}
