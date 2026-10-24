"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { CommercialSections } from "@/components/configurator/commercial-sections";
import { LightingSection } from "@/components/configurator/lighting-section";
import { ProcessingSections } from "@/components/configurator/processing-sections";
import { SummaryPanel } from "@/components/configurator/summary-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { runConfiguratorQuoteAction } from "@/modules/configurator/actions";
import {
  defaultCommercialConfig,
  type CommercialConfig,
} from "@/modules/configurator/commercial";
import { CONFIGURATOR_GLASS_TYPES } from "@/modules/configurator/glass-types";
import {
  defaultLightingConfig,
  type LightingConfig,
} from "@/modules/configurator/lighting";
import type {
  ConfiguratorQuote,
  ConfiguratorState,
} from "@/modules/configurator/map-to-engine";
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

type Props = {
  initialState?: ConfiguratorState | null;
  canOverrideLedLength?: boolean;
  canEditTariffs?: boolean;
  onChange: (payload: Record<string, unknown>) => void;
};

/**
 * Reuses professional configurator sections — not a second independent engine UI.
 */
export function ModelTechEditor({
  initialState = null,
  canOverrideLedLength = false,
  canEditTariffs = false,
  onChange,
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
    const lighting = form.lighting;
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
      processing: form.processing,
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
      processing: form.processing,
      commercial: form.commercial,
    };
    return { ok: true as const, widthMm, heightMm, state, quotePayload };
  }, [form]);

  const requestKey = parsed.ok ? JSON.stringify(parsed.quotePayload) : null;

  useEffect(() => {
    if (!parsed.ok || !requestKey) {
      onChange({});
      return;
    }
    onChange(parsed.state as unknown as Record<string, unknown>);
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const result = await runConfiguratorQuoteAction(parsed.quotePayload);
        if (result.ok) {
          setQuote(result.quote);
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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
      <div className="space-y-5">
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div>
            <h3 className="text-sm font-semibold">Configurație tehnică implicită</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Aceeași structură ca în configuratorul profesional. Prețul vine din
              motorul central — fără preț fix manual.
            </p>
          </div>

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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="model-width">Lățime implicită (mm)</Label>
              <Input
                id="model-width"
                inputMode="decimal"
                value={form.widthMm}
                onChange={(event) => update("widthMm", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="model-height">Înălțime implicită (mm)</Label>
              <Input
                id="model-height"
                inputMode="decimal"
                value={form.heightMm}
                onChange={(event) => update("heightMm", event.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Limitele min/max pentru client vor fi configurate în Stage 6.2 —
            necompletate acum.
          </p>

          <div className="grid gap-2">
            <Label htmlFor="model-glass">Tip sticlă</Label>
            <select
              id="model-glass"
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={form.glassTypeId}
              onChange={(event) => update("glassTypeId", event.target.value)}
            >
              {CONFIGURATOR_GLASS_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                  {!type.hasConfirmedPricing ? " — preț neconfigurat" : ""}
                </option>
              ))}
            </select>
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

        <LightingSection
          lighting={form.lighting}
          widthMm={parsed.ok ? parsed.widthMm : null}
          heightMm={parsed.ok ? parsed.heightMm : null}
          shapeIsRectangular={selectedShape?.engineShape === "RECTANGLE"}
          canOverrideLedLength={canOverrideLedLength}
          onChange={(lighting) => update("lighting", lighting)}
        />

        <ProcessingSections
          processing={form.processing}
          onChange={(processing) => update("processing", processing)}
        />

        <CommercialSections
          commercial={form.commercial}
          canEditTariffs={canEditTariffs}
          onChange={(commercial) => update("commercial", commercial)}
        />
      </div>

      <SummaryPanel
        quote={displayQuote}
        validationMessage={parsed.ok ? null : parsed.message}
        pending={pending && parsed.ok}
      />
    </div>
  );
}
