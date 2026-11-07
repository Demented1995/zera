"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import {
  CommercialSections,
  type CommercialPart,
} from "@/components/configurator/commercial-sections";
import { ConfigToolbar } from "@/components/configurator/config-toolbar";
import { LightingSection } from "@/components/configurator/lighting-section";
import {
  ProcessingSections,
  type ProcessingPart,
} from "@/components/configurator/processing-sections";
import { SummaryPanel } from "@/components/configurator/summary-panel";
import { Button } from "@/components/ui/button";
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
  defaultConfiguratorLayout,
  visibleConfiguratorItems,
  type ConfiguratorSectionId,
  type ConfiguratorSectionSetting,
} from "@/modules/configurator/layout";
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
  commercial: defaultCommercialConfig(),
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

type ConfiguratorWorkspaceProps = {
  canEditTariffs?: boolean;
  sections?: ConfiguratorSectionSetting[];
  initialConfigId?: string | null;
  initialConfigCode?: string | null;
  initialConfigName?: string | null;
  initialState?: ConfiguratorState | null;
  /** When set, parameters are saved here instead of a named configuration. */
  onSaveParameters?: (
    payload: Record<string, unknown>,
  ) => Promise<{ ok: boolean; message: string }>;
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

export function ConfiguratorWorkspace({
  canEditTariffs = false,
  sections = defaultConfiguratorLayout(),
  initialConfigId = null,
  initialConfigCode = null,
  initialConfigName = null,
  initialState = null,
  onSaveParameters,
}: ConfiguratorWorkspaceProps) {
  const [form, setForm] = useState<FormState>(
    initialState ? formFromState(initialState) : INITIAL,
  );
  const [quote, setQuote] = useState<ConfiguratorQuote | null>(null);
  const [pending, startTransition] = useTransition();
  const [configId, setConfigId] = useState<string | null>(initialConfigId);
  const [configCode, setConfigCode] = useState<string | null>(initialConfigCode);
  const [configName, setConfigName] = useState(
    initialConfigName ?? "Configurație nouă",
  );
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

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
        commercial: form.commercial,
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
    setDirty(true);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function buildPersistPayload(): Record<string, unknown> {
    return {
      shapeId: form.shapeId,
      widthMm: Number(form.widthMm),
      heightMm: Number(form.heightMm),
      glassTypeId: form.glassTypeId,
      manualEdgeAddsMm: {
        left: Number(form.edgeLeftMm) || 0,
        right: Number(form.edgeRightMm) || 0,
        top: Number(form.edgeTopMm) || 0,
        bottom: Number(form.edgeBottomMm) || 0,
      },
      lighting: form.lighting,
      processing: form.processing,
      commercial: form.commercial,
    };
  }

  const visibleSections = sections.filter((section) => section.enabled);

  function category(section: ConfiguratorSectionSetting) {
    const id = section.id;
    if (id === "geometry") {
      const order = visibleConfiguratorItems(section.items, ["shape", "dimensions", "glass"]);
      const place = (itemId: string) => {
        const index = order.indexOf(itemId);
        return index < 0 ? null : index;
      };
      if (order.length === 0) {
        return null;
      }
      return (
        <section key={id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
          <h2 className="text-sm font-semibold text-foreground" style={{ order: -1 }}>
            Configurare
          </h2>
          {place("shape") != null ? (
          <div className="grid gap-2" style={{ order: place("shape")! }}>
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
              <p className="text-xs text-muted-foreground">{selectedShape.description}</p>
            ) : null}
          </div>
          ) : null}
          {place("dimensions") != null ? (
          <div className="grid gap-3 sm:grid-cols-2" style={{ order: place("dimensions")! }}>
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
          ) : null}
          {place("glass") != null ? (
          <div className="grid gap-2" style={{ order: place("glass")! }}>
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
          ) : null}
          {place("shape") != null && selectedShape?.edgeMode === "manual" ? (
            <fieldset
              className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2"
              style={{ order: place("shape")! }}
            >
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
        </section>
      );
    }
    if (id === "lighting") {
      return (
        <LightingSection
          key={id}
          lighting={form.lighting}
          widthMm={parsed.widthMm}
          heightMm={parsed.heightMm}
          shapeIsRectangular={selectedShape?.engineShape === "RECTANGLE"}
          shapeId={selectedShape?.id}
          items={section.items}
          onChange={(lighting) => update("lighting", lighting)}
        />
      );
    }
    if (PROCESSING_PARTS.has(id)) {
      return (
        <ProcessingSections
          key={id}
          only={id as ProcessingPart}
          items={section.items}
          processing={form.processing}
          widthMm={parsed.widthMm}
          heightMm={parsed.heightMm}
          shapeIsRectangular={selectedShape?.engineShape === "RECTANGLE"}
          shapeId={selectedShape?.id}
          onChange={(processing) => update("processing", processing)}
        />
      );
    }
    if (COMMERCIAL_PARTS.has(id)) {
      return (
        <CommercialSections
          key={id}
          only={id as CommercialPart}
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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <div className="space-y-3">
        {onSaveParameters ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
            <div className="text-sm">
              <p className="font-medium">Parametrii oglinzii</p>
              {saveError ? <p className="text-destructive">{saveError}</p> : null}
              {saveMessage ? <p className="text-green-700">{saveMessage}</p> : null}
            </div>
            <Button
              type="button"
              disabled={!parsed.ok || pending}
              onClick={() => {
                if (!parsed.ok) {
                  return;
                }
                setSaveError(null);
                setSaveMessage(null);
                const payload = buildPersistPayload();
                startTransition(async () => {
                  const result = await onSaveParameters(payload);
                  if (!result.ok) {
                    setSaveError(result.message);
                    return;
                  }
                  setDirty(false);
                  setSaveMessage(result.message);
                });
              }}
            >
              Salvează parametrii
            </Button>
          </div>
        ) : (
          <ConfigToolbar
            configId={configId}
            configCode={configCode}
            configName={configName}
            onNameChange={(name) => {
              setDirty(true);
              setConfigName(name);
            }}
            buildPayload={buildPersistPayload}
            dirty={dirty}
            onSaved={(id, code, name) => {
              setConfigId(id);
              setConfigCode(code);
              setConfigName(name);
              setDirty(false);
            }}
          />
        )}

        {visibleSections.map((section) => category(section))}
        {visibleSections.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Nicio categorie nu este inclusă. Le poți activa din structura configuratorului.
          </p>
        ) : null}
      </div>

      <SummaryPanel
        quote={displayQuote}
        validationMessage={validationMessage}
        pending={pending && parsed.ok}
      />
    </div>
  );
}
