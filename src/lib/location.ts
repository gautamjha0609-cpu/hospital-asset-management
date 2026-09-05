import { z } from "zod";

export const ROOM_TYPES = [
  "ROOM",
  "CORRIDOR",
  "STORE",
  "WARD",
  "ICU",
  "OFFICE",
  "LAB",
  "DEPARTMENT",
  "PARKING",
  "UTILITY",
  "OPEN_AREA",
  "OTHER",
] as const;

export type RoomType = (typeof ROOM_TYPES)[number];

export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  ROOM: "Room",
  CORRIDOR: "Corridor",
  STORE: "Store",
  WARD: "Ward",
  ICU: "ICU",
  OFFICE: "Office",
  LAB: "Laboratory",
  DEPARTMENT: "Department",
  PARKING: "Parking",
  UTILITY: "Utility",
  OPEN_AREA: "Open area",
  OTHER: "Other",
};

export const buildingSchema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(40),
  address: z.string().max(500).optional().nullable(),
});

export const floorSchema = z.object({
  buildingId: z.string().min(1),
  name: z.string().min(1).max(120),
  floorNumber: z.number().int().min(-5).max(200),
  levelIndex: z.number().int().optional(),
  planWidth: z.number().positive().max(20000).optional(),
  planHeight: z.number().positive().max(20000).optional(),
});

export const pointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const roomGeometrySchema = z.object({
  points: z.array(pointSchema).min(3).max(200),
});

export const roomSchema = z.object({
  floorId: z.string().min(1),
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(40),
  type: z.enum(ROOM_TYPES),
  description: z.string().max(500).optional().nullable(),
  geometry: roomGeometrySchema,
  labelX: z.number().nullable().optional(),
  labelY: z.number().nullable().optional(),
});

export function parseRoomGeometry(json: string) {
  try {
    return roomGeometrySchema.parse(JSON.parse(json));
  } catch {
    return { points: [] };
  }
}

// Simple centroid used to auto-place labels + asset markers when a room
// doesn't have an explicit label position.
export function polygonCentroid(points: { x: number; y: number }[]) {
  if (points.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}
