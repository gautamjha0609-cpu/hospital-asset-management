import { z } from "zod";

export const ASSET_TYPES = ["MOVABLE", "IMMOVABLE"] as const;
export const ASSET_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "CONDEMNED",
  "WIP",
  "LOST",
  "UNDER_REPAIR",
] as const;
export const ASSET_CONDITIONS = ["GOOD", "FAIR", "POOR"] as const;

export const assetCreateSchema = z.object({
  description: z.string().min(1).max(1000),
  tagCode: z.string().max(120).optional().nullable(),
  outsourceFarCode: z.string().max(120).optional().nullable(),
  assetType: z.enum(ASSET_TYPES).default("MOVABLE"),
  status: z.enum(ASSET_STATUSES).default("ACTIVE"),
  condition: z.enum(ASSET_CONDITIONS).optional().nullable(),
  assetClass: z.string().max(40).optional().nullable(),
  tangibility: z.enum(["TANGIBLE", "INTANGIBLE"]).optional().nullable(),
  capitalized: z.boolean().default(true),

  costGrossBlock: z.number().default(0),
  netBlock: z.number().optional().nullable(),
  voucherDate: z.string().datetime().optional().nullable(),
  voucherNumber: z.string().max(120).optional().nullable(),
  effectiveCapitalizationDate: z.string().datetime().optional().nullable(),
  depreciationKey: z.string().max(40).optional().nullable(),

  serialNumber: z.string().max(120).optional().nullable(),
  modelNumber: z.string().max(120).optional().nullable(),
  manufacturer: z.string().max(120).optional().nullable(),
  barcode: z.string().max(120).optional().nullable(),
  qrValue: z.string().max(500).optional().nullable(),
  warrantyExpiry: z.string().datetime().optional().nullable(),

  majorCategoryId: z.string().optional().nullable(),
  finalCategoryId: z.string().optional().nullable(),
  subCategoryId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  costCenterId: z.string().optional().nullable(),
  plantCode: z.string().max(20).optional().nullable(),
  glCode: z.number().int().optional().nullable(),

  buildingId: z.string().optional().nullable(),
  floorId: z.string().optional().nullable(),
  roomId: z.string().optional().nullable(),
  mapX: z.number().optional().nullable(),
  mapY: z.number().optional().nullable(),
});

export const assetUpdateSchema = assetCreateSchema.partial();

export type AssetInput = z.infer<typeof assetCreateSchema>;

export function displayName(a: {
  name?: string | null;
  tagCode?: string | null;
  description: string;
}) {
  // Preference order: PO-derived name -> physical tag -> truncated description.
  const n = a.name?.trim();
  if (n) return n;
  const t = a.tagCode?.trim();
  if (t) return t;
  return a.description.slice(0, 80);
}
