import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin, requireUser } from "@/lib/auth";
import { roomSchema } from "@/lib/location";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    const { id } = await params;
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        floor: { include: { building: true } },
        assets: {
          orderBy: { updatedAt: "desc" },
          take: 200,
        },
      },
    });
    if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ room });
  } catch (e) {
    return errRes(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const parsed = roomSchema.partial().parse(body);
    const before = await prisma.room.findUnique({ where: { id } });
    const after = await prisma.room.update({
      where: { id },
      data: {
        name: parsed.name,
        code: parsed.code,
        type: parsed.type,
        description: parsed.description ?? undefined,
        geometry: parsed.geometry
          ? JSON.stringify({ points: parsed.geometry.points })
          : undefined,
        labelX: parsed.labelX ?? undefined,
        labelY: parsed.labelY ?? undefined,
      },
    });
    await audit({ actorId: admin.id, action: "UPDATE", entity: "room", entityId: id, before, after });
    return NextResponse.json({ room: after });
  } catch (e) {
    return errRes(e);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const strategy = req.nextUrl.searchParams.get("assets") ?? "block";
    const assetCount = await prisma.asset.count({ where: { roomId: id } });
    if (assetCount > 0 && strategy === "block") {
      return NextResponse.json(
        {
          error: `Room contains ${assetCount} asset(s).`,
          assetCount,
          hint: "?assets=unassign or ?assets=archive",
        },
        { status: 409 }
      );
    }
    if (strategy === "unassign") {
      await prisma.asset.updateMany({
        where: { roomId: id },
        data: { roomId: null, mapX: null, mapY: null },
      });
    } else if (strategy === "archive") {
      await prisma.asset.updateMany({
        where: { roomId: id },
        data: { status: "INACTIVE", roomId: null, mapX: null, mapY: null },
      });
    }
    const before = await prisma.room.findUnique({ where: { id } });
    await prisma.room.delete({ where: { id } });
    await audit({ actorId: admin.id, action: "DELETE", entity: "room", entityId: id, before });
    return NextResponse.json({ ok: true, movedAssets: assetCount, strategy });
  } catch (e) {
    return errRes(e);
  }
}

function errRes(e: unknown) {
  if (e instanceof AuthzError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
