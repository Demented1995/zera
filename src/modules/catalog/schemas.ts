import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

export const modelCategorySchema = z.object({
  id: z.string().cuid().optional(),
  name: nonEmpty.max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalid"),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().optional().default(true),
});

export const saveMirrorModelSchema = z.object({
  id: z.string().cuid().optional(),
  name: nonEmpty.max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalid"),
  shortDescription: z.string().max(300).optional().nullable(),
  fullDescription: z.string().max(5000).optional().nullable(),
  categoryId: z.string().cuid(),
  /** Target commercial status. ACTIVE is rejected server-side if calc incomplete. */
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  /** Full configurator payload (ConfiguratorState-compatible). */
  config: z.record(z.string(), z.unknown()),
  sourceConfigurationId: z.string().cuid().optional().nullable(),
});

export const duplicateMirrorModelSchema = z.object({
  id: z.string().cuid(),
});

export const archiveMirrorModelSchema = z.object({
  id: z.string().cuid(),
  archive: z.boolean(),
});

export const listModelsQuerySchema = z.object({
  q: z.string().optional().default(""),
  status: z
    .enum(["DRAFT", "ACTIVE", "ARCHIVED", "ALL"])
    .optional()
    .default("ALL"),
  categoryId: z.string().optional().default("ALL"),
  sort: z.enum(["name", "updatedAt"]).optional().default("updatedAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});
