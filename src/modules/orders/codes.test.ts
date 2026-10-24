import "dotenv/config";
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { prisma } from "@/lib/db/prisma";
import { nextModelCode } from "@/modules/catalog/codes";
import { nextCustomerCode } from "@/modules/customers/codes";
import { nextOfferNumber } from "@/modules/offers/codes";
import { nextOrderNumber } from "@/modules/orders/codes";

describe("sequential public numbers", () => {
  after(async () => {
    await prisma.$disconnect();
  });

  it("issues distinct codes when several requests run together", async () => {
    const [offers, orders, models, customers] = await Promise.all([
      Promise.all([nextOfferNumber(), nextOfferNumber(), nextOfferNumber()]),
      Promise.all([nextOrderNumber(), nextOrderNumber(), nextOrderNumber()]),
      Promise.all([nextModelCode(), nextModelCode()]),
      Promise.all([nextCustomerCode(), nextCustomerCode()]),
    ]);
    for (const batch of [offers, orders, models, customers]) {
      assert.equal(new Set(batch).size, batch.length);
    }
    assert.match(offers[0] ?? "", /^OFT-\d{4}-\d{4}$/);
    assert.match(orders[0] ?? "", /^CMD-\d{4}-\d{4}$/);
    assert.match(models[0] ?? "", /^MOD-\d{4}-\d{4}$/);
    assert.match(customers[0] ?? "", /^CLT-\d{4}-\d{4}$/);
  });
});
