import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defaultConfiguratorLayout,
  moveConfiguratorSection,
  normalizeConfiguratorLayout,
} from "@/modules/configurator/layout";

describe("professional configurator layout", () => {
  it("starts with every category included", () => {
    const layout = defaultConfiguratorLayout();
    assert.equal(layout.length, 13);
    assert.equal(layout.every((section) => section.enabled), true);
    assert.equal(layout[0]?.id, "geometry");
    assert.equal(layout.at(-1)?.id, "price");
    const processing = layout.find((section) => section.id === "processing");
    assert.deepEqual(
      processing?.items.map((item) => item.id),
      ["sandblast", "facet", "engraving"],
    );
    assert.equal(processing?.items.every((item) => item.enabled), true);
  });

  it("keeps a saved order and restores a missing category", () => {
    const layout = normalizeConfiguratorLayout([
      { id: "lighting", enabled: false },
      { id: "geometry", enabled: true },
      { id: "unknown", enabled: true },
      { id: "lighting", enabled: true },
    ]);
    assert.equal(layout[0]?.id, "lighting");
    assert.equal(layout[0]?.enabled, false);
    assert.equal(layout[1]?.id, "geometry");
    assert.equal(layout.some((section) => section.id === "defog"), true);
    assert.equal(layout.filter((section) => section.id === "lighting").length, 1);
    const processing = layout.find((section) => section.id === "processing");
    assert.deepEqual(
      processing?.items.map((item) => item.id),
      ["sandblast", "facet", "engraving"],
    );
  });

  it("keeps a saved element order and drops an unknown element", () => {
    const layout = normalizeConfiguratorLayout([
      {
        id: "processing",
        enabled: true,
        items: [
          { id: "engraving", enabled: false },
          { id: "unknown", enabled: true },
          { id: "facet", enabled: true },
          { id: "engraving", enabled: true },
        ],
      },
    ]);
    const processing = layout.find((section) => section.id === "processing");
    assert.deepEqual(
      processing?.items.map((item) => ({ id: item.id, enabled: item.enabled })),
      [
        { id: "engraving", enabled: false },
        { id: "facet", enabled: true },
        { id: "sandblast", enabled: true },
      ],
    );
  });

  it("moves a category without dropping the others", () => {
    const layout = defaultConfiguratorLayout();
    const moved = moveConfiguratorSection(layout, 0, 2);
    assert.deepEqual(
      moved.slice(0, 3).map((section) => section.id),
      ["lighting", "processing", "geometry"],
    );
    assert.equal(moved.length, layout.length);
  });
});
