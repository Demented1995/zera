"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LIGHTING_TYPES,
  lightingUsesBack,
  lightingUsesFront,
} from "@/modules/configurator/lighting";
import type { ConfiguratorQuote } from "@/modules/configurator/map-to-engine";
import { roundMoney } from "@/modules/pricing/engine";

type SummaryPanelProps = {
  quote: ConfiguratorQuote | null;
  validationMessage?: string | null;
  pending?: boolean;
};

function money(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${roundMoney(value).toFixed(2)} MDL`;
}

export function SummaryPanel({
  quote,
  validationMessage,
  pending,
}: SummaryPanelProps) {
  const calc = quote?.calculation ?? null;
  const electrical = calc?.electrical;
  const processing = calc?.processing;
  const status = validationMessage
    ? "INVALID"
    : !quote
      ? "IDLE"
      : calc
        ? calc.status
        : "INCOMPLETE";

  const lightingLabel =
    LIGHTING_TYPES.find((item) => item.id === quote?.lighting.lightingType)
      ?.label ?? "—";

  const hasProcessingCosts =
    processing != null &&
    [
      processing.sandblast,
      processing.facets,
      processing.engraving,
      processing.defog,
      processing.frames,
      processing.mounting,
      processing.cutouts,
      processing.accessories,
      processing.branding,
    ].some((value) => value !== 0 || value === null);

  return (
    <aside className="space-y-4 rounded-xl border border-border bg-card p-5 lg:sticky lg:top-20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Sumar</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Rezumat financiar A–F (sinecost) + servicii separate. INCOMPLETE /
            „Calcul incomplet” nu e preț final confirmat.
          </p>
        </div>
        <StatusBadge status={status} pending={pending} />
      </div>

      {validationMessage ? (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {validationMessage}
        </p>
      ) : null}

      {quote ? (
        <dl className="grid gap-2 text-sm">
          <Row label="Formă" value={quote.shape.label} />
          <Row label="Tip sticlă" value={quote.glassType.label} />
          <Row
            label="Dimensiuni"
            value={`${quote.widthMm} × ${quote.heightMm} mm`}
          />
          <Row label="Iluminare" value={lightingLabel} />
          <Row
            label="Arie calcul"
            value={
              calc?.meta.glassAreaM2 != null
                ? `${calc.meta.glassAreaM2.toFixed(4)} m²`
                : "—"
            }
          />
          {calc?.meta.calcWidthMm != null && calc.meta.calcHeightMm != null ? (
            <Row
              label="Gabarit calcul"
              value={`${calc.meta.calcWidthMm} × ${calc.meta.calcHeightMm} mm`}
            />
          ) : null}
          <Row label="Cost sticlă" value={money(calc?.glassCost)} />
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">
          Completați forma și dimensiunile pentru a vedea sumarul.
        </p>
      )}

      {quote && quote.ledSystems.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-border px-3 py-2 text-sm">
          <p className="font-medium text-foreground">Lungimi LED</p>
          {quote.ledSystems.map((system) => {
            const sideLabel = system.side === "front" ? "Față" : "Spate";
            return (
              <div
                key={system.side}
                className="rounded-md border border-border/60 px-2 py-1.5"
              >
                <p className="font-medium">{sideLabel}</p>
                {system.lengthError ? (
                  <p className="text-xs text-muted-foreground">
                    {system.lengthError}
                  </p>
                ) : system.length ? (
                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    <li>Bază: {system.length.baseLengthM.toFixed(2)} m</li>
                    <li>
                      Supliment 10%: {system.length.supplementM.toFixed(2)} m
                    </li>
                    <li>
                      Total: {system.length.totalLengthM.toFixed(2)} m ·{" "}
                      {system.temperatureK}K
                    </li>
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {electrical &&
      (lightingUsesFront(quote?.lighting.lightingType ?? "none") ||
        lightingUsesBack(quote?.lighting.lightingType ?? "none") ||
        (quote?.lighting.switches.length ?? 0) > 0 ||
        (quote?.lighting.transformerPcs ?? 0) > 0) ? (
        <dl className="grid gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <p className="font-medium text-foreground">Electric / LED</p>
          <Row label="LED față" value={money(electrical.frontLed)} />
          <Row label="LED spate" value={money(electrical.backLed)} />
          <Row label="Întrerupătoare" value={money(electrical.switches)} />
          <Row label="Transformatoare" value={money(electrical.transformers)} />
          <Row
            label="Profile / accesorii"
            value={money(electrical.accessories)}
          />
          <Row label="Total electric" value={money(electrical.total)} />
        </dl>
      ) : null}

      {hasProcessingCosts ? (
        <dl className="grid gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <p className="font-medium text-foreground">Prelucrări / accesorii</p>
          <Row label="Sablare" value={money(processing?.sandblast)} />
          <Row label="Fațete" value={money(processing?.facets)} />
          <Row label="Gravură" value={money(processing?.engraving)} />
          <Row label="Dezaburire" value={money(processing?.defog)} />
          <Row label="Rame" value={money(processing?.frames)} />
          <Row label="Fixare" value={money(processing?.mounting)} />
          <Row label="Găuri / decupaje" value={money(processing?.cutouts)} />
          <Row label="Accesorii" value={money(processing?.accessories)} />
          <Row label="Branding / protecție" value={money(processing?.branding)} />
          <Row label="Total prelucrări" value={money(processing?.total)} />
        </dl>
      ) : null}

      {calc?.financial ? (
        <div className="space-y-3">
          <dl className="grid gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">Rezumat financiar</p>
            <Row label="A Sticlă" value={money(calc.financial.glass)} />
            <Row label="B LED / electric" value={money(calc.financial.led)} />
            <Row
              label="C Prelucrări"
              value={money(calc.financial.processing)}
            />
            <Row
              label="D Accesorii / branding"
              value={money(calc.financial.accessories)}
            />
            <Row label="E Manoperă" value={money(calc.financial.labor)} />
            <Row
              label="F Ambalare inclusă"
              value={money(calc.financial.packagingIncluded)}
            />
            <Row
              label="Sinecost (A–F)"
              value={
                calc.status === "COMPLETE"
                  ? money(calc.financial.sinecost)
                  : "—"
              }
            />
            <Row
              label="En-gros"
              value={
                calc.status === "COMPLETE"
                  ? money(calc.financial.wholesalePrice)
                  : "—"
              }
            />
            <Row
              label="Retail"
              value={
                calc.status === "COMPLETE"
                  ? money(calc.financial.retailPrice)
                  : "—"
              }
            />
          </dl>

          <dl className="grid gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm">
            <p className="font-medium text-foreground">
              Servicii comerciale (fără adaos pe produs)
            </p>
            <Row
              label="Ambalare extra"
              value={money(calc.financial.services.packagingExtra)}
            />
            <Row
              label="Livrare"
              value={money(calc.financial.services.delivery)}
            />
            <Row
              label="Montaj"
              value={money(calc.financial.services.install)}
            />
            <Row
              label="Total servicii"
              value={money(calc.financial.services.total)}
            />
            <Row
              label={
                quote?.commercial.priceTier === "wholesale"
                  ? "Total ofertă (en-gros + servicii)"
                  : "Total ofertă (retail + servicii)"
              }
              value={
                calc.status === "COMPLETE"
                  ? money(
                      quote?.commercial.priceTier === "wholesale"
                        ? calc.financial.offerWholesale
                        : calc.financial.offerRetail,
                    )
                  : "—"
              }
            />
          </dl>
        </div>
      ) : quote ? (
        <dl className="grid gap-2 text-sm">
          <Row
            label="Sinecost producție"
            value={
              calc?.status === "COMPLETE"
                ? money(calc?.totalProductionCost)
                : "—"
            }
          />
          <Row
            label="En-gros"
            value={
              calc?.status === "COMPLETE" ? money(calc?.wholesalePrice) : "—"
            }
          />
          <Row
            label="Retail"
            value={
              calc?.status === "COMPLETE" ? money(calc?.retailPrice) : "—"
            }
          />
        </dl>
      ) : null}

      {calc && calc.status === "INCOMPLETE" ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-foreground">
          Calcul incomplet — subtotalele cunoscute apar mai jos; nu reprezinta
          un preț final confirmat.
        </p>
      ) : null}

      {quote && quote.blockers.length > 0 ? (
        <div className="rounded-lg border border-border px-3 py-2 text-sm">
          <p className="font-medium text-foreground">Informații lipsă</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
            {quote.blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {calc && calc.missingCosts.length > 0 ? (
        <div className="rounded-lg border border-border px-3 py-2 text-sm">
          <p className="font-medium text-foreground">Costuri lipsă</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
            {calc.missingCosts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {calc && calc.lines.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Linie</TableHead>
                <TableHead>Sumă</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calc.lines.map((line) => (
                <TableRow key={`${line.kind}-${line.key}`}>
                  <TableCell className="text-sm">
                    <div className="font-medium">{line.label}</div>
                    {line.note ? (
                      <div className="text-xs text-muted-foreground">
                        {line.note}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {money(line.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/70 py-1.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function StatusBadge({
  status,
  pending,
}: {
  status: string;
  pending?: boolean;
}) {
  if (pending) {
    return <Badge variant="outline">Se calculează…</Badge>;
  }
  if (status === "COMPLETE") {
    return <Badge variant="secondary">COMPLETE</Badge>;
  }
  if (status === "INCOMPLETE" || status === "INVALID") {
    return <Badge variant="outline">{status}</Badge>;
  }
  return <Badge variant="outline">—</Badge>;
}
