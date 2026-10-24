import type {
  CurvedEdgeAddsMm,
  GlassShapeKind,
} from "@/modules/pricing/engine/types";

export type GlassAreaInput = {
  widthMm: number;
  heightMm: number;
  shape: GlassShapeKind;
  curvedEdgeAdds: CurvedEdgeAddsMm;
};

export type GlassAreaResult = {
  calcWidthMm: number;
  calcHeightMm: number;
  /** Exact m² used for costing (do not pre-round before multiplying by rate). */
  areaM2: number;
};

/**
 * Compute billable glass area.
 * Rectangle/square: raw bounding box.
 * Special shapes: admin-defined curved-edge adds enlarge the bounding box per side.
 */
export function computeGlassArea(input: GlassAreaInput): GlassAreaResult {
  const { widthMm, heightMm, shape, curvedEdgeAdds } = input;

  if (shape === "RECTANGLE") {
    return {
      calcWidthMm: widthMm,
      calcHeightMm: heightMm,
      areaM2: (widthMm * heightMm) / 1_000_000,
    };
  }

  const calcWidthMm = widthMm + curvedEdgeAdds.left + curvedEdgeAdds.right;
  const calcHeightMm = heightMm + curvedEdgeAdds.top + curvedEdgeAdds.bottom;

  return {
    calcWidthMm,
    calcHeightMm,
    areaM2: (calcWidthMm * calcHeightMm) / 1_000_000,
  };
}

export function resolveCurvedEdgeAddsMm(
  curvedEdges: {
    left: boolean;
    right: boolean;
    top: boolean;
    bottom: boolean;
  },
  standardAddMm: number,
): CurvedEdgeAddsMm {
  return {
    left: curvedEdges.left ? standardAddMm : 0,
    right: curvedEdges.right ? standardAddMm : 0,
    top: curvedEdges.top ? standardAddMm : 0,
    bottom: curvedEdges.bottom ? standardAddMm : 0,
  };
}
