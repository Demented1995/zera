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
  const status = validationMessage
    ? "INVALID"
    : !quote
      ? "IDLE"
      : calc
        ? calc.status
        : "INCOMPLETE";

  return (
    <aside className="space-y-4 rounded-xl border border-border bg-card p-5 lg:sticky lg:top-20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Sumar</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Cost sticlă pe regulile confirmate. Nu reprezintă încă o oglindă
            echipată complet (LED, accesorii — Stage 5.2+).
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
          <Row
            label="Sinecost producție"
            value={money(calc?.totalProductionCost)}
          />
          <Row label="En-gros" value={money(calc?.wholesalePrice)} />
          <Row label="Retail" value={money(calc?.retailPrice)} />
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">
          Completați forma și dimensiunile pentru a vedea sumarul.
        </p>
      )}

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
