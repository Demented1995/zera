import type { PreviewControl } from "@/modules/catalog/preview/types";

function isOff(value: string): boolean {
  const text = value.trim().toLocaleLowerCase("ro");
  return text === "fără" || text === "nu" || text === "none" || text.startsWith("fără ");
}

function isStandardSandblast(value: string): boolean {
  return value.trim().toLocaleLowerCase("ro") === "sablare standard";
}

function cartLabel(control: PreviewControl): string {
  if (control.id === "glassType") {
    return "Sticlă";
  }
  if (control.id === "diffuser") {
    return "Difuzor";
  }
  return control.label;
}

function selectLabel(control: PreviewControl | undefined): string | null {
  if (!control || control.kind !== "select") {
    return null;
  }
  const match = control.options.find((option) => option.id === control.value);
  const label = match?.label ?? control.value;
  if (!label || isOff(label) || isStandardSandblast(label)) {
    return null;
  }
  return label;
}

function lineFor(control: PreviewControl): string | null {
  const label = cartLabel(control);
  if (control.kind === "text") {
    if (isOff(control.valueLabel) || isStandardSandblast(control.valueLabel)) {
      return null;
    }
    return `${label}: ${control.valueLabel}`;
  }
  if (control.kind === "select") {
    const value = selectLabel(control);
    return value ? `${label}: ${value}` : null;
  }
  if (control.kind === "toggle") {
    return control.value ? `${label}: Da` : null;
  }
  if (control.kind === "checks") {
    const chosen = control.options.filter((option) => control.values.includes(option.id));
    if (chosen.length === 0) {
      return null;
    }
    return `${label}: ${chosen.map((option) => option.label).join(", ")}`;
  }
  if (control.kind === "quantities") {
    const chosen = control.lines.filter((line) => line.qty > 0);
    if (chosen.length === 0) {
      return null;
    }
    return `${label}: ${chosen.map((line) => `${line.label} × ${line.qty}`).join(", ")}`;
  }
  return null;
}

/** Short cart lines: chosen size and the options that are actually on. */
export function selectedCartLines(controls: PreviewControl[]): string[] {
  const lines: string[] = [];
  const width = controls.find(
    (control) => control.kind === "dimension" && control.field === "widthMm",
  );
  const height = controls.find(
    (control) => control.kind === "dimension" && control.field === "heightMm",
  );
  if (width?.kind === "dimension" && height?.kind === "dimension") {
    lines.push(`Dimensiuni: ${width.value} × ${height.value} mm`);
  }

  for (const control of controls) {
    if (control.kind === "dimension" || control.id === "shape") {
      continue;
    }
    if (control.id === "defog-control" || control.id === "facet-shape" || control.id === "facet-width") {
      continue;
    }
    if (control.id === "sandblast") {
      const value =
        control.kind === "text"
          ? control.valueLabel
          : control.kind === "select"
            ? selectLabel(control)
            : null;
      if (!value || isOff(value) || isStandardSandblast(value)) {
        continue;
      }
    }
    if (control.id === "defog") {
      const on =
        (control.kind === "toggle" && control.value) ||
        (control.kind === "text" && !isOff(control.valueLabel));
      if (!on) {
        continue;
      }
      const mode = selectLabel(controls.find((item) => item.id === "defog-control"));
      lines.push(mode ? `Dezaburire: ${mode}` : "Dezaburire: Da");
      continue;
    }
    if (control.id === "facets" && control.kind === "toggle") {
      if (!control.value) {
        continue;
      }
      const shape = selectLabel(controls.find((item) => item.id === "facet-shape"));
      const facetWidth = selectLabel(controls.find((item) => item.id === "facet-width"));
      const detail = [shape, facetWidth].filter((item): item is string => Boolean(item)).join(", ");
      lines.push(detail ? `Fațetă: ${detail}` : "Fațetă: Da");
      continue;
    }
    const line = lineFor(control);
    if (line) {
      lines.push(line);
    }
  }

  return lines;
}
