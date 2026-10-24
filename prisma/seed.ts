import "dotenv/config";
import { Prisma, Role } from "@prisma/client";

import { hashPassword } from "../src/lib/auth/password";
import { prisma } from "../src/lib/db/prisma";

type SeedUser = {
  email: string;
  password: string;
  name: string;
  role: Role;
};

type SeedCategory = {
  name: string;
  slug: string;
  sortOrder: number;
};

type SeedMaterial = {
  seedKey: string;
  name: string;
  categorySlug: string;
  unitPrice: string | null;
  unitOfMeasure: string;
  internalCode?: string;
  description?: string;
};

const CATEGORIES: SeedCategory[] = [
  { name: "Sticlă de oglindă", slug: "sticla-de-oglinda", sortOrder: 10 },
  { name: "Iluminare LED", slug: "iluminare-led", sortOrder: 20 },
  { name: "Componente electrice", slug: "componente-electrice", sortOrder: 30 },
  { name: "Profile și rame", slug: "profile-si-rame", sortOrder: 40 },
  { name: "Prelucrare și sablare", slug: "prelucrare-si-sablare", sortOrder: 50 },
  { name: "Sisteme de fixare", slug: "sisteme-de-fixare", sortOrder: 60 },
  { name: "Dezaburire", slug: "dezaburire", sortOrder: 70 },
  { name: "Accesorii", slug: "accesorii", sortOrder: 80 },
  { name: "Manoperă", slug: "manopera", sortOrder: 90 },
  { name: "Ambalare", slug: "ambalare", sortOrder: 100 },
];

/** Confirmed materials only — do not invent additional prices. */
const MATERIALS: SeedMaterial[] = [
  {
    seedKey: "oglinda-standard-dreptunghiulara",
    name: "Oglindă standard dreptunghiulară",
    categorySlug: "sticla-de-oglinda",
    unitPrice: "600",
    unitOfMeasure: "m²",
  },
  {
    seedKey: "oglinda-forme-speciale",
    name: "Oglindă pentru forme speciale",
    categorySlug: "sticla-de-oglinda",
    unitPrice: "650",
    unitOfMeasure: "m²",
  },
  {
    seedKey: "banda-led",
    name: "Bandă LED",
    categorySlug: "iluminare-led",
    unitPrice: "40",
    unitOfMeasure: "metru",
  },
  {
    seedKey: "transformator",
    name: "Transformator",
    categorySlug: "componente-electrice",
    unitPrice: "100",
    unitOfMeasure: "bucată",
  },
  {
    seedKey: "senzor-touch",
    name: "Senzor touch",
    categorySlug: "componente-electrice",
    unitPrice: "100",
    unitOfMeasure: "bucată",
  },
  {
    seedKey: "sablare",
    name: "Sablare",
    categorySlug: "prelucrare-si-sablare",
    unitPrice: "600",
    unitOfMeasure: "m²",
  },
  {
    seedKey: "profil-plastic",
    name: "Profil plastic",
    categorySlug: "profile-si-rame",
    unitPrice: "10",
    unitOfMeasure: "neconfirmat",
    description: "Unitatea de măsură nu este confirmată — setați-o din admin.",
  },
];

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Set it in .env before running the seed.`,
    );
  }
  return value;
}

/** Create users only when missing — never overwrite existing passwords. */
async function ensureUser(user: SeedUser) {
  const email = user.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`User exists (unchanged): ${email}`);
    return;
  }

  const passwordHash = await hashPassword(user.password);
  await prisma.user.create({
    data: {
      email,
      name: user.name,
      passwordHash,
      role: user.role,
    },
  });
  console.log(`Created ${user.role}: ${email}`);
}

async function seedCategories() {
  for (const category of CATEGORIES) {
    await prisma.materialCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        sortOrder: category.sortOrder,
      },
      create: {
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });
  }
  console.log(`Seeded ${CATEGORIES.length} material categories`);
}

async function seedMaterials() {
  for (const item of MATERIALS) {
    const category = await prisma.materialCategory.findUnique({
      where: { slug: item.categorySlug },
    });

    if (!category) {
      throw new Error(`Missing category slug: ${item.categorySlug}`);
    }

    const unitPrice =
      item.unitPrice === null ? null : new Prisma.Decimal(item.unitPrice);

    await prisma.material.upsert({
      where: { seedKey: item.seedKey },
      update: {
        name: item.name,
        categoryId: category.id,
        unitPrice,
        unitOfMeasure: item.unitOfMeasure,
        currency: "MDL",
        internalCode: item.internalCode ?? null,
        description: item.description ?? null,
      },
      create: {
        seedKey: item.seedKey,
        name: item.name,
        categoryId: category.id,
        unitPrice,
        unitOfMeasure: item.unitOfMeasure,
        currency: "MDL",
        internalCode: item.internalCode ?? null,
        description: item.description ?? null,
        isActive: true,
      },
    });
  }
  console.log(`Seeded ${MATERIALS.length} confirmed materials`);
}

async function main() {
  const users: SeedUser[] = [
    {
      email: requireEnv("SEED_ADMIN_EMAIL"),
      password: requireEnv("SEED_ADMIN_PASSWORD"),
      name: process.env.SEED_ADMIN_NAME?.trim() || "Administrator",
      role: Role.ADMIN,
    },
  ];

  const managerEmail = process.env.SEED_MANAGER_EMAIL?.trim();
  const managerPassword = process.env.SEED_MANAGER_PASSWORD?.trim();

  if (managerEmail && managerPassword) {
    users.push({
      email: managerEmail,
      password: managerPassword,
      name: process.env.SEED_MANAGER_NAME?.trim() || "Manager",
      role: Role.MANAGER,
    });
  } else if (managerEmail || managerPassword) {
    throw new Error(
      "Set both SEED_MANAGER_EMAIL and SEED_MANAGER_PASSWORD, or neither.",
    );
  }

  for (const user of users) {
    await ensureUser(user);
  }

  await seedCategories();
  await seedMaterials();
  await seedPricingSettings();
  await seedMirrorModelCategories();
}

const MIRROR_MODEL_CATEGORIES: Array<{
  name: string;
  slug: string;
  sortOrder: number;
}> = [
  { name: "Oglinzi LED", slug: "oglinzi-led", sortOrder: 10 },
  { name: "Oglinzi fără LED", slug: "oglinzi-fara-led", sortOrder: 20 },
  { name: "Oglinzi de machiaj", slug: "oglinzi-de-machiaj", sortOrder: 30 },
  { name: "Oglinzi decorative", slug: "oglinzi-decorative", sortOrder: 40 },
  { name: "Oglinzi personalizate", slug: "oglinzi-personalizate", sortOrder: 50 },
];

async function seedMirrorModelCategories() {
  for (const category of MIRROR_MODEL_CATEGORIES) {
    await prisma.mirrorModelCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });
  }
  console.log(
    `Seeded ${MIRROR_MODEL_CATEGORIES.length} commercial mirror model categories`,
  );
}

async function seedPricingSettings() {
  await prisma.pricingSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      wholesaleMarkupPercent: new Prisma.Decimal(30),
      retailMarkupPercent: new Prisma.Decimal(70),
      curvedEdgeAddMm: new Prisma.Decimal(50),
      sandblastMinCharge: new Prisma.Decimal(100),
    },
  });
  console.log("Seeded pricing settings (wholesale 30%, retail 70%, curve +50mm, sandblast min 100)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
