import type { RichDocument } from "@/modules/catalog/content/document";
import type { CustomerConfigRequest } from "@/modules/catalog/rules/types";
import type { FeatureMode } from "@/modules/catalog/rules/types";

export type PreviewChoice = {
  id: string;
  label: string;
  /** Retail difference versus the model's included choice. Null when that option cannot be priced. */
  supplementMdl?: number | null;
};

type ControlBase = {
  id: string;
  section: string;
  label: string;
};

export type PreviewControl =
  | (ControlBase & {
      kind: "text";
      mode: "FIXED";
      valueLabel: string;
    })
  | (ControlBase & {
      kind: "select";
      mode: "EDITABLE";
      field:
        | "shapeId"
        | "glassTypeId"
        | "frontLedPositioning"
        | "backLedPositioning"
        | "frontLedStripTypeId"
        | "backLedStripTypeId"
        | "frontLightTempK"
        | "backLightTempK"
        | "switchType"
        | "defogSize"
        | "defogControl"
        | "frameType"
        | "facetShape"
        | "facetWidthMm"
        | "sandblastFinish";
      value: string;
      options: PreviewChoice[];
      numeric: boolean;
    })
  | (ControlBase & {
      kind: "toggle";
      mode: "EDITABLE";
      field:
        | "frontLedEnabled"
        | "backLedEnabled"
        | "defogEnabled"
        | "facetEnabled"
        | "engravingEnabled"
        | "antiShatterFilmEnabled";
      value: boolean;
    })
  | (ControlBase & {
      kind: "dimension";
      mode: "FIXED" | "EDITABLE";
      field: "widthMm" | "heightMm";
      value: number;
      minMm: number | null;
      maxMm: number | null;
      stepMm: number | null;
    })
  | (ControlBase & {
      kind: "checks";
      mode: "EDITABLE";
      field: "accessoryIds" | "logoIds";
      values: string[];
      options: PreviewChoice[];
    })
  | (ControlBase & {
      kind: "quantities";
      mode: "EDITABLE";
      field: "cutouts";
      lines: Array<{ type: string; label: string; qty: number }>;
    });

export type PreviewSection = {
  id: string;
  title: string;
};

export type PreviewGalleryImage = {
  id: string;
  alt: string;
  src: string;
  thumbSrc: string;
  isPrimary: boolean;
};

export type PreviewProductCopy = {
  highlights: string[];
  specs: Array<{ label: string; value: string }>;
  /** Descriptive specs that are not part of the configurator or the price. */
  extraSpecs: Array<{ id: string; label: string; value: string }>;
  care: string | null;
  warranty: string | null;
  delivery: string | null;
  description: RichDocument;
  highlightsDocument: RichDocument;
  careDocument: RichDocument;
  warrantyDocument: RichDocument;
  deliveryDocument: RichDocument;
  seo: {
    title: string | null;
    description: string | null;
    slug: string;
  };
};

export type CustomerPreviewPayload = {
  model: {
    id: string;
    name: string;
    code: string;
    shortDescription: string | null;
    fullDescription: string | null;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  };
  gallery: PreviewGalleryImage[];
  productCopy?: PreviewProductCopy;
  sections: PreviewSection[];
  controls: PreviewControl[];
  /** Delta față de configurația implicită a modelului. Fără prețuri. */
  selection: CustomerConfigRequest;
  price: {
    available: boolean;
    retailPrice: number | null;
    currency: "MDL";
    message: string | null;
  };
  notices: string[];
};

export type AdminPreviewDiagnostic = {
  calculationStatus: "COMPLETE" | "INCOMPLETE" | "UNAVAILABLE";
  missingCauses: string[];
  features: Array<{ key: string; label: string; mode: FeatureMode }>;
  dimensions: {
    width: { mode: FeatureMode; minMm: number | null; maxMm: number | null; stepMm: number | null };
    height: { mode: FeatureMode; minMm: number | null; maxMm: number | null; stepMm: number | null };
  };
  compatibility: Array<{ id: string; kind: string; detail: string }>;
  rejected: Array<{ code: string; message: string }>;
  applied: string[];
};

export type PreviewActionResult =
  | {
      ok: true;
      customer: CustomerPreviewPayload;
      diagnostic: AdminPreviewDiagnostic | null;
    }
  | { ok: false; message: string };

export type PreviewPatch =
  | { field: "widthMm" | "heightMm"; value: number }
  | {
      field: "frontLightTempK" | "backLightTempK" | "facetWidthMm" | "switchQty";
      value: number;
    }
  | {
      field:
        | "frontLedEnabled"
        | "backLedEnabled"
        | "defogEnabled"
        | "facetEnabled"
        | "engravingEnabled"
        | "antiShatterFilmEnabled";
      value: boolean;
    }
  | {
      field:
        | "shapeId"
        | "glassTypeId"
        | "frontLedPositioning"
        | "backLedPositioning"
        | "frontLedStripTypeId"
        | "backLedStripTypeId"
        | "switchType"
        | "defogSize"
        | "defogControl"
        | "frameType"
        | "facetShape"
        | "sandblastFinish";
      value: string;
    }
  | { field: "accessoryIds" | "logoIds"; value: string[] }
  | { field: "cutouts"; value: Array<{ type: string; qty: number }> };
