import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readProductTranslation } from "@/modules/catalog/content/translation";
import { localizePhrase } from "@/modules/shop/phrases";

describe("shop russian", () => {
  it("translates fixed public labels and keeps unknown product text", () => {
    assert.equal(localizePhrase("ru", "Rotundă"), "Круглое");
    assert.equal(localizePhrase("ru", "Elara"), "Elara");
    assert.equal(localizePhrase("ro", "Rotundă"), "Rotundă");
  });

  it("reads only the saved russian overlay", () => {
    const empty = readProductTranslation(null);
    assert.equal(empty.name, "");
    const saved = readProductTranslation({ ru: { name: "Элара", shortDescription: "<b>круглое</b>" } });
    assert.equal(saved.name, "Элара");
    assert.equal(saved.shortDescription, "круглое");
  });
});