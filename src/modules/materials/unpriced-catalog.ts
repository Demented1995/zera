/**
 * Configurator options that have no confirmed tariff.
 * Created without a price and without a category. An admin assigns the category;
 * the unit price stays empty until they set it.
 */
export type UnpricedCatalogItem = {
  seedKey: string;
  name: string;
  unitOfMeasure: string;
};

export const UNPRICED_SEED = {
  glassDiamant: "sticla-diamant",
  glassBronz: "sticla-bronz",
  glassGri: "sticla-gri",
  glassAntichizata: "sticla-antichizata",
  ledCob10w: "banda-led-cob-10w",
  switchMechanical: "intrerupator-mecanic",
  switchMotion: "senzor-miscare",
  mountingProfile: "profil-montaj",
  plasticFrame: "rama-plastic",
  abs: "abs",
  electricBlockCover: "capac-bloc-electric",
  lightingBlockCover: "capac-bloc-iluminare",
  connectors: "conectori",
  assembly: "ansamblu",
  plexiglassDiffuser: "difuzor-plexiglas",
  aluminiumDiffusionProfile: "profil-aluminiu-difuzie",
  sandblastPainted: "sablare-vopsita",
  sandblastLaser: "sablare-laser",
  engraving: "gravura",
  facetStraight10: "fateta-dreapta-10",
  facetStraight15: "fateta-dreapta-15",
  facetStraight20: "fateta-dreapta-20",
  facetCurved10: "fateta-curba-10",
  facetCurved15: "fateta-curba-15",
  facetCurved20: "fateta-curba-20",
  defog: "dezaburire",
  defog300x400: "dezaburire-300x400",
  defog400x500: "dezaburire-400x500",
  frameCorner10: "rama-colt-aluminiu-10",
  frameAluminiumRect: "rama-aluminiu-dreptunghiulara",
  frameAluminiumSpecial: "rama-aluminiu-speciala",
  frameMdf: "rama-mdf-vopsit",
  frameWood: "rama-lemn",
  holeLe50: "gaura-sub-50",
  holeGt50: "gaura-peste-50",
  cutoutCustom: "decupaj-personalizat",
  clock: "accesoriu-ceas",
  magnifyingMirror: "accesoriu-oglinda-maritoare",
  multimediaScreen: "accesoriu-ecran-multimedia",
  joystick: "accesoriu-joystick",
  logoLit: "logo-luminos",
  logoUnlit: "logo-neluminos",
  painting: "vopsire",
  antiShatterFilm: "folie-anti-ciobire",
  deliveryChisinau: "livrare-chisinau",
  deliveryOther: "livrare-alte-localitati",
  installMirror: "montaj-oglinda",
  installMirrorFrame: "montaj-oglinda-rama",
  installMirrorAccessories: "montaj-oglinda-accesorii",
  installCustom: "montaj-personalizat",
} as const;

export const UNPRICED_CATEGORIES: Array<{
  name: string;
  slug: string;
  sortOrder: number;
}> = [
  { name: "Livrare", slug: "livrare", sortOrder: 110 },
  { name: "Montaj", slug: "montaj", sortOrder: 120 },
];

export const UNPRICED_MATERIALS: UnpricedCatalogItem[] = [
  { seedKey: UNPRICED_SEED.glassDiamant, name: "Sticlă Diamant", unitOfMeasure: "m²" },
  { seedKey: UNPRICED_SEED.glassBronz, name: "Sticlă Bronz", unitOfMeasure: "m²" },
  { seedKey: UNPRICED_SEED.glassGri, name: "Sticlă Gri", unitOfMeasure: "m²" },
  { seedKey: UNPRICED_SEED.glassAntichizata, name: "Sticlă Antichizată", unitOfMeasure: "m²" },
  { seedKey: UNPRICED_SEED.ledCob10w, name: "Bandă LED COB 10W", unitOfMeasure: "metru" },
  { seedKey: UNPRICED_SEED.switchMechanical, name: "Întrerupător mecanic", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.switchMotion, name: "Senzor de mișcare", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.mountingProfile, name: "Profil de montaj", unitOfMeasure: "metru" },
  { seedKey: UNPRICED_SEED.plasticFrame, name: "Ramă plastic", unitOfMeasure: "metru" },
  { seedKey: UNPRICED_SEED.abs, name: "ABS", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.electricBlockCover, name: "Capac bloc electric", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.lightingBlockCover, name: "Capac bloc iluminare", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.connectors, name: "Conectori", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.assembly, name: "Ansamblu", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.plexiglassDiffuser, name: "Difuzor plexiglas", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.aluminiumDiffusionProfile, name: "Profil aluminiu difuzie", unitOfMeasure: "metru" },
  { seedKey: UNPRICED_SEED.sandblastPainted, name: "Sablare vopsită", unitOfMeasure: "m²" },
  { seedKey: UNPRICED_SEED.sandblastLaser, name: "Sablare laser", unitOfMeasure: "m²" },
  { seedKey: UNPRICED_SEED.engraving, name: "Gravură", unitOfMeasure: "m²" },
  { seedKey: UNPRICED_SEED.facetStraight10, name: "Fațetă dreaptă 10 mm", unitOfMeasure: "metru" },
  { seedKey: UNPRICED_SEED.facetStraight15, name: "Fațetă dreaptă 15 mm", unitOfMeasure: "metru" },
  { seedKey: UNPRICED_SEED.facetStraight20, name: "Fațetă dreaptă 20 mm", unitOfMeasure: "metru" },
  { seedKey: UNPRICED_SEED.facetCurved10, name: "Fațetă curbă 10 mm", unitOfMeasure: "metru" },
  { seedKey: UNPRICED_SEED.facetCurved15, name: "Fațetă curbă 15 mm", unitOfMeasure: "metru" },
  { seedKey: UNPRICED_SEED.facetCurved20, name: "Fațetă curbă 20 mm", unitOfMeasure: "metru" },
  { seedKey: UNPRICED_SEED.defog, name: "Dezaburire", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.defog300x400, name: "Dezaburire 300 × 400 mm", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.defog400x500, name: "Dezaburire 400 × 500 mm", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.frameCorner10, name: "Colțar aluminiu 10 mm", unitOfMeasure: "metru" },
  { seedKey: UNPRICED_SEED.frameAluminiumRect, name: "Ramă aluminiu dreptunghiulară", unitOfMeasure: "metru" },
  { seedKey: UNPRICED_SEED.frameAluminiumSpecial, name: "Ramă aluminiu formă specială", unitOfMeasure: "metru" },
  { seedKey: UNPRICED_SEED.frameMdf, name: "MDF vopsit", unitOfMeasure: "metru" },
  { seedKey: UNPRICED_SEED.frameWood, name: "Ramă lemn", unitOfMeasure: "metru" },
  { seedKey: UNPRICED_SEED.holeLe50, name: "Gaură ≤ 50 mm", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.holeGt50, name: "Gaură > 50 mm", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.cutoutCustom, name: "Decupaj personalizat", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.clock, name: "Ceas", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.magnifyingMirror, name: "Oglindă măritoare", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.multimediaScreen, name: "Ecran multimedia", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.joystick, name: "Joystick interactiv", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.logoLit, name: "Logo luminos", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.logoUnlit, name: "Logo neluminos", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.painting, name: "Vopsire", unitOfMeasure: "bucată" },
  { seedKey: UNPRICED_SEED.antiShatterFilm, name: "Folie anti-ciobire", unitOfMeasure: "m²" },
  { seedKey: UNPRICED_SEED.deliveryChisinau, name: "Livrare Chișinău", unitOfMeasure: "serviciu" },
  { seedKey: UNPRICED_SEED.deliveryOther, name: "Livrare alte localități", unitOfMeasure: "serviciu" },
  { seedKey: UNPRICED_SEED.installMirror, name: "Montaj oglindă", unitOfMeasure: "serviciu" },
  { seedKey: UNPRICED_SEED.installMirrorFrame, name: "Montaj oglindă + ramă", unitOfMeasure: "serviciu" },
  { seedKey: UNPRICED_SEED.installMirrorAccessories, name: "Montaj oglindă + accesorii", unitOfMeasure: "serviciu" },
  { seedKey: UNPRICED_SEED.installCustom, name: "Montaj personalizat", unitOfMeasure: "serviciu" },
];

export const DELIVERY_CATALOG_SEED: Record<"chisinau" | "other-moldova", string> = {
  chisinau: UNPRICED_SEED.deliveryChisinau,
  "other-moldova": UNPRICED_SEED.deliveryOther,
};

export const INSTALL_CATALOG_SEED: Record<
  "mirror" | "mirror-frame" | "mirror-accessories" | "custom",
  string
> = {
  mirror: UNPRICED_SEED.installMirror,
  "mirror-frame": UNPRICED_SEED.installMirrorFrame,
  "mirror-accessories": UNPRICED_SEED.installMirrorAccessories,
  custom: UNPRICED_SEED.installCustom,
};
