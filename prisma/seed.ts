import "dotenv/config";
import { Role } from "@prisma/client";

import { hashPassword } from "../src/lib/auth/password";
import { prisma } from "../src/lib/db/prisma";

type SeedUser = {
  email: string;
  password: string;
  name: string;
  role: Role;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Set it in .env before running the seed.`,
    );
  }
  return value;
}

async function upsertUser(user: SeedUser) {
  const passwordHash = await hashPassword(user.password);

  await prisma.user.upsert({
    where: { email: user.email.toLowerCase() },
    update: {
      name: user.name,
      passwordHash,
      role: user.role,
    },
    create: {
      email: user.email.toLowerCase(),
      name: user.name,
      passwordHash,
      role: user.role,
    },
  });

  console.log(`Seeded ${user.role}: ${user.email}`);
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
    await upsertUser(user);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
