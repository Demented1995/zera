import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PreviewControl } from "@/modules/catalog/preview/types";
import { selectedCartLines } from "@/modules/shop/cart-summary";

const lumi: PreviewControl[] = [
  {
    id: "shape",
    section: "dimensions",
    kind: "text",
    mode: "FIXED",
    label: "Formă",
    valueLabel: "Dreptunghiulară",
  },
  {
    id: "height",
    section: "dimensions",
    kind: "dimension",
    mode: "EDITABLE",
    label: "Înălțime",
    field: "heightMm",
    value: 800,
    minMm: 300,
    maxMm: 2900,
    stepMm: null,
  },
  {
    id: "width",
    section: "dimensions",
    kind: "dimension",
    mode: "EDITABLE",
    label: "Lățime",
    field: "widthMm",
    value: 600,
    minMm: 300,
    maxMm: 2900,
    stepMm: null,
  },
  {
    id: "glassType",
    section: "glass",
    kind: "select",
    mode: "EDITABLE",
    label: "Tip sticlă",
    field: "glassTypeId",
    value: "standard",
    options: [
      { id: "standard", label: "Standard" },
      { id: "diamant", label: "Diamant" },
    ],
    numeric: false,
  },
  {
    id: "light-temp",
    section: "lighting",
    kind: "select",
    mode: "EDITABLE",
    label: "Culoare LED",
    field: "frontLightTempK",
    value: "4000",
    options: [
      { id: "3000", label: "3000K" },
      { id: "4000", label: "4000K" },
      { id: "6000", label: "6000K" },
    ],
    numeric: true,
  },
  {
    id: "sandblast",
    section: "processing",
    kind: "text",
    mode: "FIXED",
    label: "Sablare",
    valueLabel: "Sablare standard",
  },
  {
    id: "switchType",
    section: "comfort",
    kind: "select",
    mode: "EDITABLE",
    label: "Întrerupător",
    field: "switchType",
    value: "none",
    options: [
      { id: "none", label: "Fără" },
      { id: "touch", label: "Senzor" },
    ],
    numeric: false,
  },
  {
    id: "defog",
    section: "comfort",
    kind: "toggle",
    mode: "EDITABLE",
    label: "Încălzire / dezaburire",
    field: "defogEnabled",
    value: false,
  },
  {
    id: "delivery",
    section: "services",
    kind: "toggle",
    mode: "EDITABLE",
    label: "Livrare",
    field: "deliveryEnabled",
    value: false,
  },
  {
    id: "install",
    section: "services",
    kind: "toggle",
    mode: "EDITABLE",
    label: "Montare",
    field: "installEnabled",
    value: false,
  },
];

describe("cart option summary", () => {
  it("keeps only the chosen size, glass, and LED color", () => {
    assert.deepEqual(selectedCartLines(lumi), [
      "Dimensiuni: 600 × 800 mm",
      "Sticlă: Standard",
      "Culoare LED: 4000K",
    ]);
  });

  it("adds a switch, defog control, delivery, and install when they are on", () => {
    const next = lumi.map((control) => {
      if (control.id === "switchType" && control.kind === "select") {
        return { ...control, value: "touch" };
      }
      if (control.id === "defog" && control.kind === "toggle") {
        return { ...control, value: true };
      }
      if (control.id === "delivery" && control.kind === "toggle") {
        return { ...control, value: true };
      }
      if (control.id === "install" && control.kind === "toggle") {
        return { ...control, value: true };
      }
      return control;
    });
    next.splice(
      next.findIndex((control) => control.id === "defog") + 1,
      0,
      {
        id: "defog-control",
        section: "comfort",
        kind: "select",
        mode: "EDITABLE",
        label: "Mod de control",
        field: "defogControl",
        value: "motion",
        options: [
          { id: "mechanical", label: "Întrerupător comun" },
          { id: "touch", label: "Touch" },
          { id: "motion", label: "Senzor de mișcare" },
        ],
        numeric: false,
      },
    );
    assert.deepEqual(selectedCartLines(next), [
      "Dimensiuni: 600 × 800 mm",
      "Sticlă: Standard",
      "Culoare LED: 4000K",
      "Întrerupător: Senzor",
      "Dezaburire: Senzor de mișcare",
      "Livrare: Da",
      "Montare: Da",
    ]);
  });
});
