import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shopContactLinks } from "@/modules/shop/contact-links";

describe("shop contact links", () => {
  it("builds the four header links from the company phone", () => {
    const links = shopContactLinks("+373 22 000 000");
    assert.deepEqual(
      links.map((link) => link.href),
      [
        "viber://chat?number=%2B37322000000",
        "https://wa.me/37322000000",
        "tg://resolve?phone=37322000000",
        "tel:+37322000000",
      ],
    );
    assert.equal(links.find((link) => link.id === "phone")?.text, "+373 22 000 000");
  });

  it("hides the icons when the company phone is missing", () => {
    assert.deepEqual(shopContactLinks(null), []);
    assert.deepEqual(shopContactLinks("22"), []);
  });
});
