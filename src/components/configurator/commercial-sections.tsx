"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BILLING_UNIT_LABEL,
  DELIVERY_TYPES,
  INSTALL_TYPES,
  LABOR_OPS,
  PACKAGING_TYPES,
  type CommercialConfig,
  type LaborOpId,
  type PackagingTypeId,
} from "@/modules/configurator/commercial";

type CommercialSectionsProps = {
  commercial: CommercialConfig;
  canEditTariffs: boolean;
  onChange: (next: CommercialConfig) => void;
};

function selectClass() {
  return "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";
}

export function CommercialSections({
  commercial,
  canEditTariffs,
  onChange,
}: CommercialSectionsProps) {
  function patch(partial: Partial<CommercialConfig>) {
    onChange({ ...commercial, ...partial });
  }

  function patchLabor(id: LaborOpId, partial: Partial<(typeof commercial.laborOps)[0]>) {
    patch({
      laborOps: commercial.laborOps.map((op) =>
        op.id === id ? { ...op, ...partial } : op,
      ),
    });
  }

  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Manoperă</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Operațiuni de producție — intră în sinecost. Tarifele sunt
            configurabile de ADMIN; nu se inventează rate. Nu dublează costul
            componentelor deja din catalog.
          </p>
          {!canEditTariffs ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Manager: vedeți prețurile calculate; editarea tarifelor globale e
              rezervată ADMIN.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          {commercial.laborOps.map((op) => {
            const meta = LABOR_OPS.find((item) => item.id === op.id)!;
            return (
              <div
                key={op.id}
                className="grid gap-2 rounded-md border border-border/60 p-2 sm:grid-cols-[auto_1fr_90px_110px]"
              >
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={op.enabled}
                    onChange={(event) =>
                      patchLabor(op.id, {
                        enabled: event.target.checked,
                        qty: event.target.checked
                          ? Math.max(op.qty, 1)
                          : op.qty,
                      })
                    }
                  />
                  <span>
                    {meta.label}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({BILLING_UNIT_LABEL[meta.billingUnit]})
                    </span>
                  </span>
                </label>
                <Input
                  disabled={!op.enabled}
                  value={op.note}
                  onChange={(event) =>
                    patchLabor(op.id, { note: event.target.value })
                  }
                  placeholder="Notă"
                />
                <Input
                  disabled={!op.enabled}
                  inputMode="decimal"
                  value={String(op.qty || "")}
                  onChange={(event) =>
                    patchLabor(op.id, {
                      qty: Number(event.target.value) || 0,
                    })
                  }
                  aria-label={`Cantitate ${meta.label}`}
                />
                <Input
                  disabled={!op.enabled || !canEditTariffs}
                  inputMode="decimal"
                  value={op.tariff === null ? "" : String(op.tariff)}
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    patchLabor(op.id, {
                      tariff: raw === "" ? null : Number(raw),
                    });
                  }}
                  placeholder="Tarif"
                  title={
                    canEditTariffs
                      ? "Tarif admin (MDL / unitate)"
                      : "Doar ADMIN editează tarifele"
                  }
                  className={
                    op.enabled && op.tariff === null
                      ? "border-amber-500/60"
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold">Ambalare</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Calcul doar pe reguli admin. Ambalarea produsului poate intra în
            sinecost; ambalarea extra client e afișată separat (fără adaos
            automat).
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Tip ambalare</Label>
            <select
              className={selectClass()}
              value={commercial.packagingType}
              onChange={(event) =>
                patch({
                  packagingType: event.target.value as PackagingTypeId,
                })
              }
            >
              {PACKAGING_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          {commercial.packagingType !== "none" ? (
            <>
              <div className="grid gap-1.5">
                <Label>Rol</Label>
                <select
                  className={selectClass()}
                  value={commercial.packagingRole}
                  onChange={(event) =>
                    patch({
                      packagingRole: event.target
                        .value as CommercialConfig["packagingRole"],
                    })
                  }
                >
                  <option value="included">Inclusă în sinecost</option>
                  <option value="extra">Extra client (serviciu)</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Cantitate</Label>
                <Input
                  inputMode="decimal"
                  value={String(commercial.packagingQty || "")}
                  onChange={(event) =>
                    patch({
                      packagingQty: Number(event.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Tarif admin (MDL)</Label>
                <Input
                  disabled={!canEditTariffs}
                  inputMode="decimal"
                  value={
                    commercial.packagingTariff === null
                      ? ""
                      : String(commercial.packagingTariff)
                  }
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    patch({
                      packagingTariff: raw === "" ? null : Number(raw),
                    });
                  }}
                  placeholder="neconfigurat"
                  className={
                    commercial.packagingTariff === null
                      ? "border-amber-500/60"
                      : undefined
                  }
                />
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold">Livrare</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Separată de prețul oglinzii. Fără tarife/km inventate — doar tarife
            centrale admin.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Tip livrare</Label>
            <select
              className={selectClass()}
              value={commercial.deliveryType}
              onChange={(event) =>
                patch({
                  deliveryType: event.target
                    .value as CommercialConfig["deliveryType"],
                })
              }
            >
              {DELIVERY_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          {commercial.deliveryType === "other-moldova" ? (
            <>
              <div className="grid gap-1.5">
                <Label>Localitate</Label>
                <Input
                  value={commercial.deliveryLocality}
                  onChange={(event) =>
                    patch({ deliveryLocality: event.target.value })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Distanță (km)</Label>
                <Input
                  inputMode="decimal"
                  value={
                    commercial.deliveryDistanceKm === null
                      ? ""
                      : String(commercial.deliveryDistanceKm)
                  }
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    patch({
                      deliveryDistanceKm: raw === "" ? null : Number(raw),
                    });
                  }}
                />
              </div>
            </>
          ) : null}
          {commercial.deliveryType !== "pickup" ? (
            <>
              <div className="grid gap-1.5">
                <Label>Tarif livrare (MDL)</Label>
                <Input
                  disabled={!canEditTariffs}
                  inputMode="decimal"
                  value={
                    commercial.deliveryTariff === null
                      ? ""
                      : String(commercial.deliveryTariff)
                  }
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    patch({
                      deliveryTariff: raw === "" ? null : Number(raw),
                    });
                  }}
                  placeholder="neconfigurat"
                  className={
                    commercial.deliveryTariff === null
                      ? "border-amber-500/60"
                      : undefined
                  }
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Note livrare</Label>
                <Input
                  value={commercial.deliveryNotes}
                  onChange={(event) =>
                    patch({ deliveryNotes: event.target.value })
                  }
                />
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold">Montaj</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Separat de sinecostul de producție. Fără costuri inventate pe etaj /
            complexitate — doar tarif admin + câmpuri informative.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Tip montaj</Label>
            <select
              className={selectClass()}
              value={commercial.installType}
              onChange={(event) =>
                patch({
                  installType: event.target
                    .value as CommercialConfig["installType"],
                })
              }
            >
              {INSTALL_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          {commercial.installType !== "none" ? (
            <>
              <div className="grid gap-1.5">
                <Label>Cantitate</Label>
                <Input
                  inputMode="numeric"
                  value={String(commercial.installQty)}
                  onChange={(event) =>
                    patch({
                      installQty: Math.max(
                        0,
                        Math.floor(Number(event.target.value) || 0),
                      ),
                    })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Complexitate (notă)</Label>
                <Input
                  value={commercial.installComplexity}
                  onChange={(event) =>
                    patch({ installComplexity: event.target.value })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Etaj</Label>
                <Input
                  inputMode="numeric"
                  value={
                    commercial.installFloor === null
                      ? ""
                      : String(commercial.installFloor)
                  }
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    patch({
                      installFloor:
                        raw === "" ? null : Math.floor(Number(raw)),
                    });
                  }}
                />
              </div>
              <label className="flex items-center gap-2 text-sm self-end pb-2">
                <input
                  type="checkbox"
                  checked={commercial.installManualCarry}
                  onChange={(event) =>
                    patch({ installManualCarry: event.target.checked })
                  }
                />
                Necesită cărat manual
              </label>
              <div className="grid gap-1.5">
                <Label>Tarif montaj (MDL)</Label>
                <Input
                  disabled={!canEditTariffs}
                  inputMode="decimal"
                  value={
                    commercial.installTariff === null
                      ? ""
                      : String(commercial.installTariff)
                  }
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    patch({
                      installTariff: raw === "" ? null : Number(raw),
                    });
                  }}
                  placeholder="neconfigurat"
                  className={
                    commercial.installTariff === null
                      ? "border-amber-500/60"
                      : undefined
                  }
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Note montaj</Label>
                <Input
                  value={commercial.installNotes}
                  onChange={(event) =>
                    patch({ installNotes: event.target.value })
                  }
                />
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold">Nivel preț ofertă</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Total ofertă = preț produs (en-gros sau retail) + servicii
            comerciale.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={commercial.priceTier === "wholesale"}
              onChange={() => patch({ priceTier: "wholesale" })}
            />
            En-gros
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={commercial.priceTier === "retail"}
              onChange={() => patch({ priceTier: "retail" })}
            />
            Retail
          </label>
        </div>
      </section>
    </div>
  );
}
