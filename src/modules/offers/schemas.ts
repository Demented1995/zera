import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

export const saveConfigurationSchema = z.object({
  id: z.string().cuid().optional(),
  name: nonEmpty.max(200),
  internalNotes: z.string().max(2000).optional().nullable(),
  /** Full configurator payload (ConfiguratorState-compatible). */
  config: z.record(z.string(), z.unknown()),
  forceDraft: z.boolean().optional().default(false),
});

export const duplicateConfigurationSchema = z.object({
  id: z.string().cuid(),
});

export const listConfigurationsQuerySchema = z.object({
  q: z.string().optional().default(""),
  status: z
    .enum(["DRAFT", "COMPLETE", "INCOMPLETE", "ALL"])
    .optional()
    .default("ALL"),
  sort: z
    .enum(["updatedAt", "name", "code", "sinecost", "retailPrice"])
    .optional()
    .default("updatedAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const createOfferSchema = z.object({
  configurationId: z.string().cuid().optional().nullable(),
  clientName: nonEmpty.max(200),
  clientPhone: nonEmpty.max(50),
  clientEmail: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value === "" ? null : value)),
  clientCompany: z.string().max(200).optional().nullable(),
  clientNotes: z.string().max(2000).optional().nullable(),
  productName: nonEmpty.max(200),
  quantity: z.coerce.number().int().positive().default(1),
  priceTier: z.enum(["wholesale", "retail"]).default("retail"),
  validityDays: z.coerce.number().int().positive().max(365).default(14),
  commercialNotes: z.string().max(2000).optional().nullable(),
  /** Optional live config when creating from configurator without prior save. */
  config: z.record(z.string(), z.unknown()).optional(),
});

export const issueOfferSchema = z.object({
  offerId: z.string().cuid(),
  /** When editing an issued offer, force a new revision instead of overwrite. */
  createRevision: z.boolean().optional().default(false),
  config: z.record(z.string(), z.unknown()).optional(),
  productName: z.string().max(200).optional(),
  quantity: z.coerce.number().int().positive().optional(),
  priceTier: z.enum(["wholesale", "retail"]).optional(),
  validityDays: z.coerce.number().int().positive().max(365).optional(),
  commercialNotes: z.string().max(2000).optional().nullable(),
  clientName: z.string().max(200).optional(),
  clientPhone: z.string().max(50).optional(),
  clientEmail: z.string().optional().nullable(),
  clientCompany: z.string().max(200).optional().nullable(),
  clientNotes: z.string().max(2000).optional().nullable(),
});

export const companySettingsSchema = z.object({
  legalName: z.string().max(300).optional().nullable(),
  taxId: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  bankDetails: z.string().max(500).optional().nullable(),
});
