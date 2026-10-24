import type { AdminPreviewDiagnostic } from "@/modules/catalog/preview/types";

const MODE_LABEL = {
  FIXED: "Fix",
  EDITABLE: "Editabil",
  HIDDEN: "Ascuns",
} as const;

export function PreviewDiagnostics({
  diagnostic,
}: {
  diagnostic: AdminPreviewDiagnostic;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-dashed border-border bg-muted/30 p-5">
      <div>
        <h2 className="text-sm font-semibold tracking-wide uppercase">
          Diagnostic administrator
        </h2>
        <p className="text-sm text-muted-foreground">
          Verificare internă a regulilor. Nu face parte din interfața clientului.
        </p>
      </div>
      <p className="text-sm">
        Status calcul:{" "}
        <span className="font-medium">
          {diagnostic.calculationStatus === "COMPLETE"
            ? "Complet"
            : diagnostic.calculationStatus === "INCOMPLETE"
              ? "Incomplet"
              : "Indisponibil"}
        </span>
      </p>
      {diagnostic.missingCauses.length > 0 ? (
        <div className="space-y-1 text-sm">
          <p className="font-medium">Cauza prețului incomplet</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {diagnostic.missingCauses.map((cause) => (
              <li key={cause}>{cause}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p>
          Lățime: {MODE_LABEL[diagnostic.dimensions.width.mode]}
          {formatLimits(diagnostic.dimensions.width)}
        </p>
        <p>
          Înălțime: {MODE_LABEL[diagnostic.dimensions.height.mode]}
          {formatLimits(diagnostic.dimensions.height)}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {diagnostic.features.map((feature) => (
          <div
            key={feature.key}
            className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2 text-sm"
          >
            <span>{feature.label}</span>
            <span className="text-muted-foreground">{MODE_LABEL[feature.mode]}</span>
          </div>
        ))}
      </div>
      {diagnostic.compatibility.length > 0 ? (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {diagnostic.compatibility.map((rule) => (
            <li key={rule.id}>
              {rule.kind}
              {rule.detail ? ` (${rule.detail})` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {diagnostic.applied.length > 0 ? (
        <p className="text-sm">Aplicate: {diagnostic.applied.join(", ")}</p>
      ) : null}
      {diagnostic.rejected.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {diagnostic.rejected.map((issue) => (
            <li key={`${issue.code}-${issue.message}`}>
              {issue.code}: {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function formatLimits(rule: {
  minMm: number | null;
  maxMm: number | null;
  stepMm: number | null;
}): string {
  const parts = [
    rule.minMm != null ? `min ${rule.minMm}` : null,
    rule.maxMm != null ? `max ${rule.maxMm}` : null,
    rule.stepMm != null ? `pas ${rule.stepMm}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? ` · ${parts.join(" · ")} mm` : "";
}
