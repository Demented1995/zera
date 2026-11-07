import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { homepageSelectionMessage } from "@/modules/shop/homepage";

describe("homepage categories", () => {
  it("accepts up to four selected categories", () => {
    assert.equal(homepageSelectionMessage(0), null);
    assert.equal(homepageSelectionMessage(4), null);
  });

  it("rejects a fifth category", () => {
    assert.equal(
      homepageSelectionMessage(5),
      "Poți afișa cel mult 4 categorii pe pagina principală.",
    );
  });
});
