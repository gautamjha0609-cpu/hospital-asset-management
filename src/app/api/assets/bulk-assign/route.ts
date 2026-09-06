import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

const payload = z.object({
  assetIds: z.array(z.string().min(1)).min(1).max(2000),
  roomId: z.string().nullable(), // null = unassign
  reason: z.string().max(300).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = payload.parse(await req.json());

    let target: { id: string; floorId: string } | null = null;
    if (body.roomId) {
      const r = await prisma.room.findUnique({
        where: { id: body.roomId },
        select: { id: true, floorId: true },
      });
      if (!r) return NextResponse.json({ error: "Room not found" }, { status: 404 });
      target = r;
    }

    const assets = await prisma.asset.findMany({
      where: { id: { in: body.assetIds } },
      select: { id: true, roomId: true },
    });

    let moved = 0;
    await prisma.$transaction(async (tx) => {
      for (const a of assets) {
        if (a.roomId === (target?.id ?? null)) continue;
        await tx.asset.update({
          where: { id: a.id },
          data: {
            roomId: target?.id ?? null,
            floorId: target?.floorId ?? null,
            mapX: null,
            mapY: null,
            updatedById: admin.id,
          },
        });
        await tx.assetLocationHistory.create({
          data: {
            assetId: a.id,
            roomId: target?.id ?? null,
            floorId: target?.floorId ?? null,
            movedById: admin.id,
            reason: body.reason ?? "Bulk assignment",
          },
        });
        moved += 1;
      }
    });

    await audit({
      actorId: admin.id,
      action: "MOVE",
      entity: "asset_bulk",
      after: { requested: body.assetIds.length, moved, roomId: target?.id ?? null },
    });

    return NextResponse.json({ ok: true, requested: body.assetIds.length, moved });
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: "Validation failed", issues: (e as { issues: unknown }).issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
