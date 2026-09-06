import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

// Batched verification save — one call per walk-through session, all
// records share the same batchId so the whole session is queryable.
const payload = z.object({
  roomId: z.string().min(1),
  items: z
    .array(
      z.object({
        assetId: z.string().min(1),
        outcome: z.enum(["PRESENT", "MISSING", "MOVED", "CONDEMNED", "UNDER_REPAIR"]),
        notes: z.string().max(500).optional().nullable(),
        photoPath: z.string().max(1000).optional().nullable(),
        // For MOVED, admins may pass the new roomId so we also relocate
        movedToRoomId: z.string().optional().nullable(),
      })
    )
    .min(1)
    .max(1000),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = payload.parse(await req.json());
    const batchId = randomUUID();

    // Refuse if room doesn't exist
    const room = await prisma.room.findUnique({ where: { id: body.roomId } });
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    let present = 0;
    let missing = 0;
    let moved = 0;
    let condemned = 0;

    await prisma.$transaction(async (tx) => {
      for (const it of body.items) {
        await tx.assetVerification.create({
          data: {
            assetId: it.assetId,
            roomId: body.roomId,
            outcome: it.outcome,
            notes: it.notes ?? null,
            photoPath: it.photoPath ?? null,
            verifiedById: user.id,
            batchId,
          },
        });

        const updates: Record<string, unknown> = {
          lastVerifiedAt: new Date(),
          lastVerifiedById: user.id,
        };

        if (it.outcome === "PRESENT") {
          present += 1;
          // If asset wasn't in this room yet, bring it in.
          const a = await tx.asset.findUnique({
            where: { id: it.assetId },
            select: { roomId: true, floorId: true },
          });
          if (a && a.roomId !== body.roomId) {
            updates.roomId = body.roomId;
            updates.floorId = room.floorId;
            await tx.assetLocationHistory.create({
              data: {
                assetId: it.assetId,
                roomId: body.roomId,
                floorId: room.floorId,
                movedById: user.id,
                reason: "Physical verification — found in room",
              },
            });
          }
        } else if (it.outcome === "MISSING") {
          missing += 1;
          updates.status = "LOST";
          await tx.assetStatusHistory.create({
            data: {
              assetId: it.assetId,
              newStatus: "LOST",
              changedById: user.id,
              reason: "Physical verification — missing from room",
            },
          });
        } else if (it.outcome === "MOVED") {
          moved += 1;
          if (it.movedToRoomId) {
            const target = await tx.room.findUnique({ where: { id: it.movedToRoomId } });
            if (target) {
              updates.roomId = it.movedToRoomId;
              updates.floorId = target.floorId;
              await tx.assetLocationHistory.create({
                data: {
                  assetId: it.assetId,
                  roomId: it.movedToRoomId,
                  floorId: target.floorId,
                  movedById: user.id,
                  reason: "Physical verification — relocated",
                  notes: it.notes ?? null,
                },
              });
            }
          }
        } else if (it.outcome === "CONDEMNED") {
          condemned += 1;
          updates.status = "CONDEMNED";
          await tx.assetStatusHistory.create({
            data: {
              assetId: it.assetId,
              newStatus: "CONDEMNED",
              changedById: user.id,
              reason: "Physical verification — condemned",
            },
          });
        } else if (it.outcome === "UNDER_REPAIR") {
          updates.status = "UNDER_REPAIR";
          await tx.assetStatusHistory.create({
            data: {
              assetId: it.assetId,
              newStatus: "UNDER_REPAIR",
              changedById: user.id,
              reason: "Physical verification — under repair",
            },
          });
        }

        await tx.asset.update({ where: { id: it.assetId }, data: updates });
      }
    });

    await audit({
      actorId: user.id,
      action: "UPDATE",
      entity: "asset_verification_batch",
      entityId: batchId,
      after: { roomId: body.roomId, present, missing, moved, condemned, total: body.items.length },
    });

    return NextResponse.json({
      batchId,
      summary: { present, missing, moved, condemned, total: body.items.length },
    });
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: "Validation failed", issues: (e as { issues: unknown }).issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
