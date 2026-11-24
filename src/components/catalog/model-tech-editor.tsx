"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  CommercialSections,
  type CommercialPart,
} from "@/components/configurator/commercial-sections";
import { LightingSection } from "@/components/configurator/lighting-section";
import {
  ProcessingSections,
  type ProcessingPart,
} from "@/components/configurator/processing-sections";
import { SummaryPanel } from "@/components/configurator/summary-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { runConfiguratorQuoteAction } from "@/modules/configurator/actions";
import {
  defaultCommercialConfig,
  type CommercialConfig,
} from "@/modules/configurator/commercial";
import {
  defaultLightingConfig,
  MODEL_RULE_EXTRA_IDS,
  type LightingConfig,
} from "@/modules/configurator/lighting";
import type {
  ConfiguratorQuote,
  ConfiguratorState,
} from "@/modules/configurator/map-to-engine";
import {
  defaultConfiguratorLayout,
  visibleConfiguratorItems,
  type ConfiguratorSectionId,
  type ConfiguratorSectionSetting,
} from "@/modules/configurator/layout";
import {
  defaultProcessingConfig,
  type ProcessingConfig,
} from "@/modules/configurator/processing";
import {
  CONFIGURATOR_SHAPES,
  getShapeById,
} from "@/modules/configurator/shapes";

type FormState = {
  shapeId: string;
  widthMm: string;
  heightMm: string;
  glassTypeId: string;
  edgeLeftMm: string;
  edgeRightMm: string;
  edgeTopMm: string;
  edgeBottomMm: string;
  lighting: LightingConfig;
  processing: ProcessingConfig;
  commercial: CommercialConfig;
};

function formFromState(state: ConfiguratorState): FormState {
  return {
    shapeId: state.shapeId,
    widthMm: String(state.widthMm),
    heightMm: String(state.heightMm),
    glassTypeId: state.glassTypeId,
    edgeLeftMm: String(state.manualEdgeAddsMm.left),
    edgeRightMm: String(state.manualEdgeAddsMm.right),
    edgeTopMm: String(state.manualEdgeAddsMm.top),
    edgeBottomMm: String(state.manualEdgeAddsMm.bottom),
    lighting: { ...defaultLightingConfig(), ...state.lighting },
    processing: { ...defaultProcessingConfig(), ...state.processing },
    commercial: { ...defaultCommercialConfig(), ...state.commercial },
  };
}

const INITIAL: FormState = {
  shapeId: "rectangular",
  widthMm: "600",
  heightMm: "800",
  glassTypeId: "standard",
  edgeLeftMm: "0",
  edgeRightMm: "0",
  edgeTopMm: "0",
  edgeBottomMm: "0",
  lighting: defaultLightingConfig(),
  processing: defaultProcessingConfig(),
  commercial: defaultCommercialConfig(),
};

function parsePositive(value: string): number | null {
  const n = Number(value.trim());
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

function parseNonNeg(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return 0;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return n;
}

const PROCESSING_PARTS = new Set<ConfiguratorSectionId>([
  "processing",
  "defog",
  "frames",
  "cutouts",
  "accessories",
  "branding",
]);

const COMMERCIAL_PARTS = new Set<ConfiguratorSectionId>([
  "labor",
  "packaging",
  "delivery",
  "install",
  "price",
]);

type Props = {
  initialState?: ConfiguratorState | null;
  canEditTariffs?: boolean;
  /** Same saved structure as the professional configurator. */
  sections?: ConfiguratorSectionSetting[];
  onChange: (payload: Record<string, unknown>) => void;
  onGaps?: (items: string[]) => void;
};

/**
 * Reuses professional configurator sections — not a second independent engine UI.
 */
export function ModelTechEditor({
  initialState = null,
  canEditTariffs = false,
  sections = defaultConfiguratorLayout(),
  onChange,
  onGaps,
}: Props) {
  const [form, setForm] = useState<FormState>(
    initialState ? formFromState(initialState) : INITIAL,
  );
  const [quote, setQuote] = useState<ConfiguratorQuote | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedShape = useMemo(
    () => getShapeById(form.shapeId),
    [form.shapeId],
  );

  const parsed = useMemo(() => {
    const widthMm = parsePositive(form.widthMm);
    const heightMm = parsePositive(form.heightMm);
    const edges = {
      left: parseNonNeg(form.edgeLeftMm),
      right: parseNonNeg(form.edgeRightMm),
      top: parseNonNeg(form.edgeTopMm),
      bottom: parseNonNeg(form.edgeBottomMm),
    };
    if (widthMm === null || heightMm === null) {
      return { ok: false as const, message: "Dimensiuni invalide." };
    }
    if (
      edges.left === null ||
      edges.right === null ||
      edges.top === null ||
      edges.bottom === null
    ) {
      return { ok: false as const, message: "Adaosuri pe laturi invalide." };
    }
    const hiddenExtras = new Set<string>(MODEL_RULE_EXTRA_IDS);
    const lighting: LightingConfig = {
      ...form.lighting,
      extraComponents: form.lighting.extraComponents.map((item) =>
        hiddenExtras.has(item.id) ? { ...item, enabled: false, qty: 0 } : item,
      ),
    };
    const state: ConfiguratorState = {
      shapeId: form.shapeId,
      widthMm,
      heightMm,
      glassTypeId: form.glassTypeId,
      manualEdgeAddsMm: {
        left: edges.left,
        right: edges.right,
        top: edges.top,
        bottom: edges.bottom,
      },
      lighting,
      processing: {
        ...form.processing,
        defogEnabled: false,
        mountingComponents: [],
      },
      commercial: form.commercial,
    };
    const quotePayload = {
      shapeId: form.shapeId,
      widthMm,
      heightMm,
      glassTypeId: form.glassTypeId,
      edgeLeftMm: edges.left,
      edgeRightMm: edges.right,
      edgeTopMm: edges.top,
      edgeBottomMm: edges.bottom,
      lightingType: lighting.lightingType,
      frontLed: lighting.front,
      backLed: lighting.back,
      switches: lighting.switches,
      transformerPcs: lighting.transformerPcs,
      electricalConnection: lighting.electricalConnection,
      extraComponents: lighting.extraComponents,
      processing: {
        ...form.processing,
        defogEnabled: false,
        mountingComponents: [],
      },
      commercial: form.commercial,
    };
    return { ok: true as const, widthMm, heightMm, state, quotePayload };
  }, [form]);

  const requestKey = parsed.ok ? JSON.stringify(parsed.quotePayload) : null;

  useEffect(() => {
    if (!parsed.ok || !requestKey) {
      onGaps?.(parsed.ok ? [] : [parsed.message]);
      onChange({});
      return;
    }
    onChange(parsed.state as unknown as Record<string, unknown>);
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const result = await runConfiguratorQuoteAction(parsed.quotePayload);
        if (result.ok) {
          setQuote(result.quote);
          onGaps?.(quoteGaps(result.quote));
        }
      });
    }, 220);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const displayQuote = parsed.ok ? quote : null;
  const visibleSections = sections.filter((section) => section.enabled);

  function modelSection(section: ConfiguratorSectionSetting) {
    const widthMm = parsed.ok ? parsed.widthMm : null;
    const heightMm = parsed.ok ? parsed.heightMm : null;
    const shapeIsRectangular = selectedShape?.engineShape === "RECTANGLE";

    if (section.id === "geometry") {
      const shown = visibleConfiguratorItems(section.items, [
        "shape",
        "dimensions",
        "glass",
      ]);
      if (!shown.includes("shape")) {
        return null;
      }
      return (
        <section key={section.id} className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="grid gap-2">
            <Label htmlFor="model-shape">Formă</Label>
            <select
              id="model-shape"
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={form.shapeId}
              onChange={(event) => update("shapeId", event.target.value)}
            >
              {CONFIGURATOR_SHAPES.map((shape) => (
                <option key={shape.id} value={shape.id}>
                  {shape.label}
                </option>
              ))}
            </select>
            {selectedShape ? (
              <p className="text-xs text-muted-foreground">{selectedShape.description}</p>
            ) : null}
          </div>
          {selectedShape?.edgeMode === "manual" ? (
            <fieldset className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
              <legend className="px-1 text-xs text-muted-foreground">
                Adaosuri manuale (mm)
              </legend>
              {(
                [
                  ["edgeLeftMm", "Stânga"],
                  ["edgeRightMm", "Dreapta"],
                  ["edgeTopMm", "Sus"],
                  ["edgeBottomMm", "Jos"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="grid gap-1.5">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    inputMode="decimal"
                    value={form[key]}
                    onChange={(event) => update(key, event.target.value)}
                  />
                </div>
              ))}
            </fieldset>
          ) : null}
        </section>
      );
    }

    if (section.id === "defog") {
      return null;
    }

    if (section.id === "lighting") {
      return (
        <LightingSection
          key={section.id}
          lighting={form.lighting}
          widthMm={widthMm}
          heightMm={heightMm}
          shapeIsRectangular={shapeIsRectangular}
          shapeId={selectedShape?.id}
          showTemperature={false}
          items={section.items.filter(
            (item) =>
              item.id !== "diffuser" &&
              item.id !== "switches" &&
              item.id !== "power",
          )}
          checkExtrasWithLed
          hiddenExtraIds={MODEL_RULE_EXTRA_IDS}
          onChange={(lighting) => update("lighting", lighting)}
        />
      );
    }

    if (PROCESSING_PARTS.has(section.id)) {
      return (
        <ProcessingSections
          key={section.id}
          only={section.id as ProcessingPart}
          items={
            section.id === "frames"
              ? section.items.filter(
                  (item) => item.id !== "mounting" && item.id !== "hardware",
                )
              : section.items
          }
          processing={form.processing}
          widthMm={widthMm}
          heightMm={heightMm}
          shapeIsRectangular={shapeIsRectangular}
          shapeId={selectedShape?.id}
          onChange={(processing) => update("processing", processing)}
        />
      );
    }

    if (COMMERCIAL_PARTS.has(section.id)) {
      return (
        <CommercialSections
          key={section.id}
          only={section.id as CommercialPart}
          items={section.items}
          commercial={form.commercial}
          canEditTariffs={canEditTariffs}
          onChange={(commercial) => update("commercial", commercial)}
        />
      );
    }

    return null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold">Configurație tehnică</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Apar doar elementele incluse în structura configuratorului. Tipul de
            sticlă și temperatura LED le introduce clientul.{" "}
            <Link href="/admin/configurator/structura" className="underline-offset-2 hover:underline">
              Editează elementele
            </Link>
          </p>
        </div>
        <section className="space-y-3 rounded-xl border border-border bg-card p-5">
          <div>
            <h4 className="text-sm font-semibold">Dimensiune de început</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Cu aceste valori se deschide modelul pe site. Clientul le poate
              modifica între limitele din reguli.
              {form.shapeId === "round"
                ? " La oglinda rotundă, lățimea este diametrul. Pentru un cerc, pune aceeași valoare și la înălțime, de exemplu 500 × 500."
                : ""}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="model-start-width">
                {form.shapeId === "round" ? "Diametru / lățime (mm)" : "Lățime (mm)"}
              </Label>
              <Input
                id="model-start-width"
                inputMode="decimal"
                value={form.widthMm}
                onChange={(event) => update("widthMm", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model-start-height">Înălțime (mm)</Label>
              <Input
                id="model-start-height"
                inputMode="decimal"
                value={form.heightMm}
                onChange={(event) => update("heightMm", event.target.value)}
              />
            </div>
          </div>
        </section>
        {visibleSections.map((section) => modelSection(section))}
      </div>

      <SummaryPanel
        quote={displayQuote}
        validationMessage={parsed.ok ? null : parsed.message}
        pending={pending && parsed.ok}
      />
    </div>
  );
}

function quoteGaps(quote: ConfiguratorQuote): string[] {
  return [
    ...new Set(
      [...(quote.calculation?.missingCosts ?? []), ...quote.blockers]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}
