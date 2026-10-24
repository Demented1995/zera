import { PageHeader } from "@/components/admin/page-header";
import { CustomerForm } from "@/components/customers/customer-form";
import { emptyCustomerForm } from "@/modules/customers/form-values";
import { requireStaffSession } from "@/lib/auth/guards";
import { canManageCustomers } from "@/modules/customers/permissions";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Client nou",
};

export default async function NewCustomerPage() {
  const session = await requireStaffSession();
  if (!canManageCustomers(session.user.role)) {
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client nou"
        description="Poți salva clientul fără adresă. Un telefon sau email deja folosit este semnalat, fără să blocheze înregistrarea."
      />
      <CustomerForm initial={emptyCustomerForm()} />
    </div>
  );
}
