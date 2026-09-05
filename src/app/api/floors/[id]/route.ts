import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin, requireUser } from "@/lib/auth";
import { floorSchema } from "@/lib/location";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    const { id } = await params;
    const floor = await prisma.floor.findUnique({
      where: { id },
      include: {
        building: true,
        rooms: { orderBy: { name: "asc" } },
        mapObjects: true,
      },
    });
    if (!floor) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ floor });
  } catch (e) {
    return errRes(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const parsed = floorSchema.partial().parse(body);
    const before = await prisma.floor.findUnique({ where: { id } });
    const after = await prisma.floor.update({ where: { id }, data: parsed });
    await audit({ actorId: admin.id, action: "UPDATE", entity: "floor", entityId: id, before, after });
    return NextResponse.json({ floor: after });
  } catch (e) {
    return errRes(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const assetCount = await prisma.asset.count({ where: { floorId: id } });
    if (assetCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete floor: ${assetCount} asset(s) still located here.` },
        { status: 409 }
      );
    }
    const before = await prisma.floor.findUnique({ where: { id } });
    await prisma.floor.delete({ where: { id } });
    await audit({ actorId: admin.id, action: "DELETE", entity: "floor", entityId: id, before });
    return NextResponse.json({ ok: true });
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
