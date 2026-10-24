import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defaultCommercialConfig } from "@/modules/configurator/commercial";
import { defaultLightingConfig } from "@/modules/configurator/lighting";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";
import { defaultProcessingConfig } from "@/modules/configurator/processing";
import { buildOfferPdfBytes } from "@/modules/offers/pdf";
import {
  canEditCompanySettings,
  canEditGlobalTariffs,
  canManageConfigurations,
  canManageOffers,
  canViewSinecost,
} from "@/modules/offers/permissions";
import {
  buildImmutableSnapshot,
  toPublicCalculation,
} from "@/modules/offers/snapshots";
import {
  deriveConfigStatus,
  resolveOfferDisplayStatus,
} from "@/modules/offers/status";
import type { CalculationResult } from "@/modules/pricing/engine";

function baseState(): ConfiguratorState {
  return {
    shapeId: "rectangular",
    widthMm: 600,
    heightMm: 1000,
    glassTypeId: "standard",
    manualEdgeAddsMm: { left: 0, right: 0, top: 0, bottom: 0 },
    lighting: defaultLightingConfig(),
    processing: defaultProcessingConfig(),
    commercial: defaultCommercialConfig(),
  };
}

function completeCalc(): CalculationResult {
  return {
    status: "COMPLETE",
    glassCost: 360,
    componentCosts: 0,
    operationCosts: 0,
    laborCost: 0,
    totalProductionCost: 360,
    serviceCosts: 80,
    wholesalePrice: 468,
    retailPrice: 612,
    missingCosts: [],
    lines: [],
    financial: {
      glass: 360,
      led: 0,
      processing: 0,
      accessories: 0,
      labor: 0,
      packagingIncluded: 0,
      sinecost: 360,
      wholesalePrice: 468,
      retailPrice: 612,
      services: {
        packagingExtra: 0,
        delivery: 80,
        install: 0,
        other: 0,
        total: 80,
      },
      offerWholesale: 548,
      offerRetail: 692,
    },
    meta: {
      calcWidthMm: 600,
      calcHeightMm: 1000,
      glassAreaM2: 0.6,
      glassRate: 600,
      sandblastAreaM2: null,
    },
  };
}

describe("config/offer status helpers", () => {
  it("derives COMPLETE / INCOMPLETE / DRAFT from calculation", () => {
    assert.equal(deriveConfigStatus(completeCalc(), false), "COMPLETE");
    assert.equal(
      deriveConfigStatus(
        { ...completeCalc(), status: "INCOMPLETE", missingCosts: ["x"] },
        false,
      ),
      "INCOMPLETE",
    );
    assert.equal(deriveConfigStatus(null, true), "DRAFT");
  });

  it("marks issued offers EXPIRED by validity without destroying meaning", () => {
    const past = new Date(Date.now() - 86400000);
    assert.equal(resolveOfferDisplayStatus("ISSUED", past), "EXPIRED");
    assert.equal(resolveOfferDisplayStatus("REJECTED", past), "REJECTED");
    assert.equal(
      resolveOfferDisplayStatus("ISSUED", new Date(Date.now() + 86400000)),
      "ISSUED",
    );
  });
});

describe("customer-safe snapshots", () => {
  it("public calculation never exposes sinecost field", () => {
    const pub = toPublicCalculation(completeCalc(), "retail");
    assert.equal(pub.unitPrice, 612);
    assert.equal(pub.servicesTotal, 80);
    assert.equal(
      Object.prototype.hasOwnProperty.call(pub, "sinecost"),
      false,
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(pub, "totalProductionCost"),
      false,
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(pub, "glassCost"),
      false,
    );
  });

  it("immutable snapshot keeps issued prices", () => {
    const snap = buildImmutableSnapshot({
      offerNumber: "OFT-2026-0001",
      revisionNumber: 1,
      state: baseState(),
      calculation: completeCalc(),
      client: { name: "Client Test", phone: "+37360000000" },
      productName: "Oglindă test",
      quantity: 1,
      priceTier: "retail",
      unitPrice: 612,
      servicesTotal: 80,
      offerTotal: 692,
      validityDays: 14,
      validUntil: new Date("2026-12-01"),
      company: {
        legalName: "ZERA SRL",
        taxId: "1000000",
        address: "Chișinău",
        phone: "+37322000000",
        email: null,
        bankDetails: null,
      },
    });
    assert.equal(snap.unitPrice, 612);
    assert.equal(snap.offerTotal, 692);
    assert.equal(snap.tech.widthMm, 600);
    assert.ok(!("sinecost" in snap.publicCalculation));
  });

  it("PDF bytes generate and do not embed sinecost label", async () => {
    const snap = buildImmutableSnapshot({
      offerNumber: "OFT-2026-0099",
      revisionNumber: 1,
      state: baseState(),
      calculation: completeCalc(),
      client: { name: "Client PDF", phone: "+37361111111" },
      productName: "Oglindă PDF",
      quantity: 1,
      priceTier: "wholesale",
      unitPrice: 468,
      servicesTotal: 0,
      offerTotal: 468,
      validityDays: 7,
      validUntil: null,
      company: {
        legalName: "ZERA SRL",
        taxId: "1000000",
        address: "Chișinău",
        phone: "+37322000000",
        email: "office@zera.local",
        bankDetails: null,
      },
    });
    const bytes = await buildOfferPdfBytes(snap);
    assert.ok(bytes.byteLength > 1000);
    const header = Buffer.from(bytes.subarray(0, 5)).toString("ascii");
    assert.equal(header, "%PDF-");
    // Custom-font PDFs store glyphs as CIDs; clear-text search is unreliable.
    // Guard the commercial contract: snapshot public calc + PDF inputs never carry sinecost.
    assert.equal(
      Object.prototype.hasOwnProperty.call(snap.publicCalculation, "sinecost"),
      false,
    );
    const raw = Buffer.from(bytes).toString("latin1").toLowerCase();
    assert.equal(raw.includes("sinecost"), false);
    assert.equal(raw.includes("totalproductioncost"), false);
  });
});

describe("Stage 5.5 ADMIN / MANAGER permissions", () => {
  it("allows both roles to manage configs and offers", () => {
    assert.equal(canManageConfigurations("ADMIN"), true);
    assert.equal(canManageConfigurations("MANAGER"), true);
    assert.equal(canManageOffers("ADMIN"), true);
    assert.equal(canManageOffers("MANAGER"), true);
    assert.equal(canViewSinecost("ADMIN"), true);
    assert.equal(canViewSinecost("MANAGER"), true);
  });

  it("restricts company settings and global tariffs to ADMIN", () => {
    assert.equal(canEditCompanySettings("ADMIN"), true);
    assert.equal(canEditCompanySettings("MANAGER"), false);
    assert.equal(canEditGlobalTariffs("ADMIN"), true);
    assert.equal(canEditGlobalTariffs("MANAGER"), false);
  });
});
