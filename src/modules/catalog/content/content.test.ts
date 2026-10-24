import "dotenv/config";
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  documentToSource,
  parseRichSource,
  plainText,
} from "@/modules/catalog/content/document";
import { saveModelContent } from "@/modules/catalog/content/service";
import { slugFormatError } from "@/modules/catalog/content/slug-policy";
import { derivePublicSpecifications } from "@/modules/catalog/content/specs";
import {
  canManageModelContent,
  canViewModelContent,
} from "@/modules/catalog/permissions";
import { defaultConfiguratorRules } from "@/modules/catalog/rules/defaults";
import { slugifyModelName } from "@/modules/catalog/slug";
import { defaultCommercialConfig } from "@/modules/configurator/commercial";
import { defaultLightingConfig } from "@/modules/configurator/lighting";
import { defaultProcessingConfig } from "@/modules/configurator/processing";

const createdModelIds: string[] = [];

function sampleConfig() {
  return {
    shapeId: "rectangular",
    widthMm: 600,
    heightMm: 800,
    glassTypeId: "standard",
    manualEdgeAddsMm: { left: 0, right: 0, top: 0, bottom: 0 },
    lighting: defaultLightingConfig(),
    processing: defaultProcessingConfig(),
    commercial: defaultCommercialConfig(),
  };
}

describe("product copy, specs and seo", () => {
  it("builds slugs from Romanian diacritics and blocks reserved routes", () => {
    assert.equal(slugifyModelName("Oglindă cu ușă și șifonier"), "oglinda-cu-usa-si-sifonier");
    assert.equal(slugifyModelName("Țară Ântâi"), "tara-antai");
    assert.equal(slugFormatError("admin"), "Acest slug este rezervat unei rute a aplicației.");
    assert.equal(slugFormatError("oglinda-baie"), null);
    assert.equal(canManageModelContent("ADMIN"), true);
    assert.equal(canManageModelContent("MANAGER"), false);
    assert.equal(canViewModelContent("MANAGER"), true);
  });

  it("keeps Romanian text and drops active HTML", () => {
    const document = parseRichSource(
      "## Întreținere\n\nOglindă **ușoară** și [detalii](javascript:alert(1)).\n\n- fără aburi\n\n<script>alert(1)</script>",
    );
    const source = documentToSource(document);
    const plain = plainText(document);
    assert.match(plain, /Întreținere/);
    assert.match(plain, /ușoară/);
    assert.equal(
      documentToSource(parseRichSource("Suprafață **clară**.")),
      "Suprafață **clară**.",
    );
    assert.equal(source.includes("javascript:"), false);
    assert.equal(plain.includes("<script"), false);
    assert.equal(JSON.stringify(document).includes("<"), false);
    const heading = document.blocks.find((block) => block.type === "heading");
    assert.equal(heading && heading.type === "heading" ? heading.level : 0, 2);
    assert.equal(
      document.blocks.some((block) => block.type === "list"),
      true,
    );
  });

  it("reads public specs from the configurator and hides forbidden options", () => {
    const config = sampleConfig();
    const specs = derivePublicSpecifications({ configJson: config, rulesJson: null });
    const labels = specs.map((spec) => spec.label);
    assert.ok(labels.includes("Forma oglinzii"));
    assert.ok(labels.includes("Dimensiuni disponibile"));
    assert.ok(labels.includes("Tip sticlă"));
    assert.equal(labels.includes("Grosimea sticlei"), false);
    assert.equal(labels.includes("Temperatura luminii"), false);
    assert.equal(labels.includes("Tip întrerupător"), false);
    assert.equal(specs.find((spec) => spec.id === "lighting")?.value, "Fără iluminare");

    const rules = defaultConfiguratorRules();
    rules.features.shape = { mode: "HIDDEN" };
    rules.features.glassType = { mode: "EDITABLE", allowedValues: ["standard"] };
    rules.features.frontLed = { mode: "HIDDEN" };
    rules.features.backLed = { mode: "HIDDEN" };
    const filtered = derivePublicSpecifications({ configJson: config, rulesJson: rules });
    assert.equal(
      filtered.some((spec) => spec.id === "shape"),
      false,
    );
    assert.equal(
      filtered.some((spec) => spec.id === "lighting"),
      false,
    );
    const glass = filtered.find((spec) => spec.id === "glass");
    assert.match(glass?.options ?? "", /Standard/);
    assert.equal((glass?.options ?? "").includes("Bronz"), false);
  });

  it("saves incomplete copy, keeps a manual slug, and redirects a published slug", async () => {
    const user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const category = await prisma.mirrorModelCategory.findFirst();
    assert.ok(user);
    assert.ok(category);
    const stamp = Date.now();
    const model = await prisma.mirrorModel.create({
      data: {
        code: `MOD-COPY-${stamp}`,
        name: "Oglindă test",
        slug: `oglinda-test-${stamp}`,
        categoryId: category.id,
        status: "DRAFT",
        slugCustomized: false,
        configJson: sampleConfig(),
        calcStatus: "DRAFT",
        shapeId: "rectangular",
        shapeLabel: "Dreptunghiulară",
        glassTypeId: "standard",
        defaultWidthMm: new Prisma.Decimal(600),
        defaultHeightMm: new Prisma.Decimal(800),
        createdById: user.id,
        updatedById: user.id,
      },
    });
    createdModelIds.push(model.id);
    const image = await prisma.mirrorModelImage.create({
      data: {
        modelId: model.id,
        isPrimary: true,
        storageKey: `models/${model.id}/pending`,
        originalName: "foto.jpg",
        mimeType: "image/jpeg",
        widthPx: 10,
        heightPx: 10,
        byteSize: 10,
        uploadedById: user.id,
        altText: "",
      },
    });

    const draft = await saveModelContent(prisma, {
      modelId: model.id,
      name: `Oglindă de baie ${stamp}`,
      slug: "",
      slugEdited: false,
      shortDescription: "",
      descriptionSource: "",
      highlightsSource: "",
      careSource: "",
      warrantySource: "",
      deliverySource: "",
      extraSpecs: [{ id: "1", label: "", value: "nu se salvează" }],
      seoTitle: "",
      seoDescription: "",
      primaryImageId: image.id,
      primaryAltText: "Fața oglinzii",
    });
    assert.equal(draft.ok, true);
    if (!draft.ok) {
      return;
    }
    assert.equal(draft.slug, slugifyModelName(`Oglindă de baie ${stamp}`));
    const stored = await prisma.mirrorModel.findUniqueOrThrow({ where: { id: model.id } });
    assert.equal(stored.warrantyJson, null);
    assert.equal(stored.fullDescription, null);
    assert.equal(stored.configJson && typeof stored.configJson === "object", true);
    assert.equal(stored.slugCustomized, false);
    const alt = await prisma.mirrorModelImage.findUniqueOrThrow({ where: { id: image.id } });
    assert.equal(alt.altText, "Fața oglinzii");

    const manual = await saveModelContent(prisma, {
      modelId: model.id,
      name: "Alt nume comercial",
      slug: `${draft.slug}-manual`,
      slugEdited: true,
      shortDescription: "Scurt",
      descriptionSource: "Descriere **completă**",
      highlightsSource: "- rezistentă",
      careSource: "",
      warrantySource: "",
      deliverySource: "",
      extraSpecs: [{ id: "thick", label: "Grosime sticlă", value: "4 mm" }],
      seoTitle: "Oglindă baie",
      seoDescription: "Descriere pentru căutare",
      primaryImageId: image.id,
      primaryAltText: "Fața oglinzii",
    });
    assert.equal(manual.ok, true);
    const renamed = await saveModelContent(prisma, {
      modelId: model.id,
      name: "Nume schimbat din nou",
      slug: `${draft.slug}-manual`,
      slugEdited: false,
      shortDescription: "Scurt",
      descriptionSource: "Descriere **completă**",
      highlightsSource: "- rezistentă",
      careSource: "",
      warrantySource: "",
      deliverySource: "",
      extraSpecs: [],
      seoTitle: "Oglindă baie",
      seoDescription: "",
      primaryImageId: null,
      primaryAltText: null,
    });
    assert.equal(renamed.ok, true);
    if (renamed.ok) {
      assert.equal(renamed.slug, `${draft.slug}-manual`);
    }

    await prisma.mirrorModel.update({
      where: { id: model.id },
      data: { isPublished: true },
    });
    const publishedSlug = `${draft.slug}-public`;
    const moved = await saveModelContent(prisma, {
      modelId: model.id,
      name: "Nume schimbat din nou",
      slug: publishedSlug,
      slugEdited: true,
      shortDescription: "Scurt",
      descriptionSource: "Descriere",
      highlightsSource: "",
      careSource: "",
      warrantySource: "",
      deliverySource: "",
      extraSpecs: [],
      seoTitle: "",
      seoDescription: "",
      primaryImageId: null,
      primaryAltText: null,
    });
    assert.equal(moved.ok, true);
    const redirect = await prisma.mirrorModelSlugRedirect.findUnique({
      where: { slug: `${draft.slug}-manual` },
    });
    assert.equal(redirect?.modelId, model.id);
    const collision = await saveModelContent(prisma, {
      modelId: model.id,
      name: "Nume schimbat din nou",
      slug: "admin",
      slugEdited: true,
      shortDescription: "",
      descriptionSource: "",
      highlightsSource: "",
      careSource: "",
      warrantySource: "",
      deliverySource: "",
      extraSpecs: [],
      seoTitle: "",
      seoDescription: "",
      primaryImageId: null,
      primaryAltText: null,
    });
    assert.equal(collision.ok, false);

    const reloaded = await prisma.mirrorModel.findUniqueOrThrow({ where: { id: model.id } });
    assert.equal(reloaded.slug, publishedSlug);
    assert.match(reloaded.fullDescription ?? "", /Descriere/);
    assert.equal(reloaded.status, "DRAFT");
    assert.equal(reloaded.isPublished, true);
  });
});

after(async () => {
  if (createdModelIds.length > 0) {
    await prisma.mirrorModel.deleteMany({ where: { id: { in: createdModelIds } } });
  }
  await prisma.$disconnect();
});
