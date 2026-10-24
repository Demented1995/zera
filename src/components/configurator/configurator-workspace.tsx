"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { LightingSection } from "@/components/configurator/lighting-section";
import { ProcessingSections } from "@/components/configurator/processing-sections";
import { SummaryPanel } from "@/components/configurator/summary-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { runConfiguratorQuoteAction } from "@/modules/configurator/actions";
import { CONFIGURATOR_GLASS_TYPES } from "@/modules/configurator/glass-types";
import {
  defaultLightingConfig,
  type LightingConfig,
} from "@/modules/configurator/lighting";
import type { ConfiguratorQuote } from "@/modules/configurator/map-to-engine";
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
};

const INITIAL: FormState = {
  shapeId: "rectangular",
  widthMm: "600",
  heightMm: "1000",
  glassTypeId: "standard",
  edgeLeftMm: "0",
  edgeRightMm: "0",
  edgeTopMm: "0",
  edgeBottomMm: "0",
  lighting: defaultLightingConfig(),
  processing: defaultProcessingConfig(),
};

function parsePositive(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const n = Number(trimmed);
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

type ConfiguratorWorkspaceProps = {
  canOverrideLedLength?: boolean;
};

export function ConfiguratorWorkspace({
  canOverrideLedLength = false,
}: ConfiguratorWorkspaceProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
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
      edgeLeftMm: parseNonNeg(form.edgeLeftMm),
      edgeRightMm: parseNonNeg(form.edgeRightMm),
      edgeTopMm: parseNonNeg(form.edgeTopMm),
      edgeBottomMm: parseNonNeg(form.edgeBottomMm),
    };

    if (widthMm === null || heightMm === null) {
      return {
        ok: false as const,
        message:
          "Introduceți dimensiuni pozitive (fără zero sau valori negative).",
        widthMm,
        heightMm,
      };
    }

    if (
      selectedShape?.edgeMode === "manual" &&
      Object.values(edges).some((value) => value === null)
    ) {
      return {
        ok: false as const,
        message: "Adaosurile pe laturi trebuie să fie ≥ 0.",
        widthMm,
        heightMm,
      };
    }

    const lighting = form.lighting;
    if (
      (lighting.lightingType === "front" || lighting.lightingType === "both") &&
      lighting.front.useManualOverride &&
      !lighting.front.manualOverrideReason.trim()
    ) {
      return {
        ok: false as const,
        message: "Motiv obligatoriu pentru override-ul lungimii LED față.",
        widthMm,
        heightMm,
      };
    }
    if (
      (lighting.lightingType === "back" || lighting.lightingType === "both") &&
      lighting.back.useManualOverride &&
      !lighting.back.manualOverrideReason.trim()
    ) {
      return {
        ok: false as const,
        message: "Motiv obligatoriu pentru override-ul lungimii LED spate.",
        widthMm,
        heightMm,
      };
    }

    return {
      ok: true as const,
      widthMm,
      heightMm,
      payload: {
        shapeId: form.shapeId,
        widthMm,
        heightMm,
        glassTypeId: form.glassTypeId,
        edgeLeftMm: edges.edgeLeftMm ?? 0,
        edgeRightMm: edges.edgeRightMm ?? 0,
        edgeTopMm: edges.edgeTopMm ?? 0,
        edgeBottomMm: edges.edgeBottomMm ?? 0,
        lightingType: lighting.lightingType,
        frontLed: lighting.front,
        backLed: lighting.back,
        switches: lighting.switches,
        transformerPcs: lighting.transformerPcs,
        electricalConnection: lighting.electricalConnection,
        extraComponents: lighting.extraComponents,
        processing: form.processing,
      },
    };
  }, [form, selectedShape?.edgeMode]);

  const requestKey = parsed.ok ? JSON.stringify(parsed.payload) : null;

  useEffect(() => {
    if (!parsed.ok || !requestKey) {
      return;
    }

    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const result = await runConfiguratorQuoteAction(parsed.payload);
        if (!result.ok) {
          setQuote(null);
          return;
        }
        setQuote(result.quote);
      });
    }, 220);

    return () => window.clearTimeout(handle);
    // requestKey captures payload changes; parsed.ok is implied by requestKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const displayQuote = parsed.ok ? quote : null;
  const validationMessage = parsed.ok ? null : parsed.message;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <div className="space-y-5">
        <section className="space-y-5 rounded-xl border border-border bg-card p-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Configurare
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Stage 5.3 — formă, dimensiuni, LED, prelucrări și accesorii.
              Actualizare automată la modificare.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="shape">Formă oglindă</Label>
            <select
              id="shape"
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
              <p className="text-xs text-muted-foreground">
                {selectedShape.description}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="width">Lățime (mm)</Label>
              <Input
                id="width"
                inputMode="decimal"
                value={form.widthMm}
                onChange={(event) => update("widthMm", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="height">Înălțime (mm)</Label>
              <Input
                id="height"
                inputMode="decimal"
                value={form.heightMm}
                onChange={(event) => update("heightMm", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="glass">Tip sticlă</Label>
            <select
              id="glass"
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
                Adaosuri manuale pe laturi (mm)
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

          {selectedShape?.edgeMode === "preset" ? (
            <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Adaosurile pe laturi urmează regula confirmată din motorul de calcul
              (nu sunt inventate în interfață).
            </p>
          ) : null}
        </section>

        <LightingSection
          lighting={form.lighting}
          widthMm={parsed.widthMm}
          heightMm={parsed.heightMm}
          shapeIsRectangular={selectedShape?.engineShape === "RECTANGLE"}
          canOverrideLedLength={canOverrideLedLength}
          onChange={(lighting) => update("lighting", lighting)}
        />

        <ProcessingSections
          processing={form.processing}
          onChange={(processing) => update("processing", processing)}
        />
      </div>

      <SummaryPanel
        quote={displayQuote}
        validationMessage={validationMessage}
        pending={pending && parsed.ok}
      />
    </div>
  );
}
