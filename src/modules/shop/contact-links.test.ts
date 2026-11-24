import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { productQuestionLinks, productQuestionText, shopContactLinks } from "@/modules/shop/contact-links";

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

  it("writes the model and the chosen size into the question", () => {
    assert.equal(
      productQuestionText("ro", "Luxor", 500, 700),
      "Bună ziua. Aș vrea să întreb despre oglinda Luxor, 500 × 700 mm.",
    );
    assert.equal(
      productQuestionText("ru", "Luxor", 500, 700),
      "Здравствуйте. Хочу узнать про зеркало Luxor, 500 × 700 мм.",
    );
    assert.equal(
      productQuestionText("ro", "Luxor", null, null),
      "Bună ziua. Aș vrea să întreb despre oglinda Luxor.",
    );
  });

  it("opens WhatsApp and Viber with that question already written", () => {
    const text = "Bună ziua. Aș vrea să întreb despre oglinda Luxor, 500 × 700 mm.";
    const links = productQuestionLinks("+373 22 000 000", text);
    assert.deepEqual(
      links.map((link) => link.href),
      [
        `viber://chat?number=%2B37322000000&draft=${encodeURIComponent(text)}`,
        `https://wa.me/37322000000?text=${encodeURIComponent(text)}`,
        "tg://resolve?phone=37322000000",
      ],
    );
    assert.deepEqual(productQuestionLinks(null, text), []);
    assert.deepEqual(productQuestionLinks("+373 22 000 000", "  "), []);
  });
});
