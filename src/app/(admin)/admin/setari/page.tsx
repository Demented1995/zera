import { PageHeader } from "@/components/admin/page-header";
import { CompanySettingsForm } from "@/components/offers/company-settings-form";
import { requirePageAccess } from "@/lib/auth/guards";
import { getCompanySettings } from "@/modules/offers/company";

export const metadata = {
  title: "Setări | ZERA",
};

export default async function SetariPage() {
  await requirePageAccess("admin");
  const company = await getCompanySettings();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Setări"
        description="Date legale ale firmei pentru oferte PDF. Doar ADMIN."
      />
      <CompanySettingsForm
        initial={{
          legalName: company.legalName,
          taxId: company.taxId,
          address: company.address,
          phone: company.phone,
          email: company.email,
          bankDetails: company.bankDetails,
        }}
      />
    </div>
  );
}
