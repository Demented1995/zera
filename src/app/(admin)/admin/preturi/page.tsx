import { PageHeader } from "@/components/admin/page-header";
import { PricingCalculator } from "@/components/pricing/pricing-calculator";
import { PricingFormulas } from "@/components/pricing/pricing-formulas";
import { PricingHistory } from "@/components/pricing/pricing-history";
import { PricingSettingsForm } from "@/components/pricing/pricing-settings-form";
import { requireStaffSession } from "@/lib/auth/guards";
import { canEditPricingRules } from "@/modules/pricing/permissions";
import {
  getPricingSettings,
  getPricingSettingsHistory,
} from "@/modules/pricing/queries";
import {
  serializePricingHistory,
  serializePricingSettings,
} from "@/modules/pricing/serialize";

export const metadata = {
  title: "Prețuri și formule",
};

export default async function PreturiPage() {
  const session = await requireStaffSession();
  const canEdit = canEditPricingRules(session.user.role);

  const [settings, history] = await Promise.all([
    getPricingSettings(),
    getPricingSettingsHistory(),
  ]);

  const settingsDto = serializePricingSettings(settings);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Prețuri și formule"
        description="Reguli globale de calcul pe costul de producție. Catalogul de materiale rămâne sursa prețurilor unitare."
      />

      <PricingSettingsForm settings={settingsDto} canEdit={canEdit} />
      <PricingFormulas settings={settingsDto} />
      <PricingCalculator />
      <PricingHistory history={history.map(serializePricingHistory)} />
    </div>
  );
}
