import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ROOM_TYPES } from "@/lib/location";

type Ctx = { params: Promise<{ id: string }> };

const savePayload = z.object({
  rooms: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      code: z.string().min(1),
      type: z.enum(ROOM_TYPES),
      points: z.array(z.object({ x: z.number(), y: z.number() })).min(3),
      labelX: z.number().nullable().optional(),
      labelY: z.number().nullable().optional(),
    })
  ),
  mapObjects: z.array(
    z.object({
      id: z.string().optional(),
      kind: z.enum(["WALL", "DOOR", "WINDOW", "LABEL", "LINE"]),
      data: z.record(z.unknown()),
    })
  ),
  assets: z.array(
    z.object({
      id: z.string(),
      x: z.number(),
      y: z.number(),
    })
  ),
});

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id: floorId } = await params;
    const body = savePayload.parse(await req.json());

    const floor = await prisma.floor.findUnique({ where: { id: floorId } });
    if (!floor) return NextResponse.json({ error: "Floor not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      // Room upserts
      const keepRoomIds = new Set<string>();
      for (const r of body.rooms) {
        if (r.id) {
          const updated = await tx.room.update({
            where: { id: r.id },
            data: {
              name: r.name,
              code: r.code,
              type: r.type,
              geometry: JSON.stringify({ points: r.points }),
              labelX: r.labelX ?? null,
              labelY: r.labelY ?? null,
            },
          });
          keepRoomIds.add(updated.id);
        } else {
          const created = await tx.room.create({
            data: {
              floorId,
              name: r.name,
              code: r.code,
              type: r.type,
              geometry: JSON.stringify({ points: r.points }),
              labelX: r.labelX ?? null,
              labelY: r.labelY ?? null,
            },
          });
          keepRoomIds.add(created.id);
        }
      }
      // Delete rooms that were removed. Refuse if they still hold assets.
      const existing = await tx.room.findMany({
        where: { floorId },
        select: { id: true, _count: { select: { assets: true } } },
      });
      for (const e of existing) {
        if (!keepRoomIds.has(e.id)) {
          if (e._count.assets > 0) continue; // keep silently; caller can force via DELETE with strategy
          await tx.room.delete({ where: { id: e.id } });
        }
      }

      // Map objects: replace-all is safe here because they're small
      await tx.mapObject.deleteMany({ where: { floorId } });
      for (const o of body.mapObjects) {
        await tx.mapObject.create({
          data: {
            floorId,
            kind: o.kind,
            data: JSON.stringify(o.data),
          },
        });
      }

      // Asset positions
      for (const a of body.assets) {
        await tx.asset.update({
          where: { id: a.id },
          data: { mapX: a.x, mapY: a.y, floorId },
        });
      }
    });

    await audit({
      actorId: admin.id,
      action: "MAP_EDIT",
      entity: "floor",
      entityId: floorId,
      after: { rooms: body.rooms.length, objects: body.mapObjects.length, assets: body.assets.length },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: "Validation failed", issues: (e as { issues: unknown }).issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
