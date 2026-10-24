import { MATERIAL_CURRENCY } from "@/modules/materials/constants";
import type { PricingSettingsDTO } from "@/modules/pricing/serialize";

type PricingFormulasProps = {
  settings: PricingSettingsDTO;
};

export function PricingFormulas({ settings }: PricingFormulasProps) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Formule active</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Prețurile unitare ale materialelor vin din catalogul Materiale. Adaosurile
          de mai jos sunt pe cost de producție (nu pe preț de vânzare).
        </p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-border px-3 py-2">
          <dt className="text-muted-foreground">En-gros</dt>
          <dd className="mt-1 font-medium">
            cost × (1 + {settings.wholesaleMarkupPercent}% / 100)
          </dd>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <dt className="text-muted-foreground">Retail</dt>
          <dd className="mt-1 font-medium">
            cost × (1 + {settings.retailMarkupPercent}% / 100)
          </dd>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <dt className="text-muted-foreground">Sticlă dreptunghiulară</dt>
          <dd className="mt-1 font-medium">
            (lățime × înălțime / 1e6) × preț oglindă standard ({MATERIAL_CURRENCY}/m²)
          </dd>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <dt className="text-muted-foreground">Forme speciale</dt>
          <dd className="mt-1 font-medium">
            ((l + stânga + dreapta) × (h + sus + jos) / 1e6) × preț forme speciale.
            Adaos standard pe latură curbă: {settings.curvedEdgeAddMm} mm (doar pe
            laturile marcate de admin).
          </dd>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <dt className="text-muted-foreground">Sablare decorativă</dt>
          <dd className="mt-1 font-medium">
            max({settings.sandblastMinCharge} {MATERIAL_CURRENCY}, arie × tarif
            sablare). Minim o dată pe operațiune, nu pe bandă. Simbolul touch este
            inclus în prețul senzorului.
          </dd>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <dt className="text-muted-foreground">Componente</dt>
          <dd className="mt-1 font-medium">
            Doar cantități explicite: LED (m), transformator (buc), touch (buc). Fără
            consumuri inventate pentru profile, rame, manoperă sau dezaburire.
          </dd>
        </div>
      </dl>
    </section>
  );
}
