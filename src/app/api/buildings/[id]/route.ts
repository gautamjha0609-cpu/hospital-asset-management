import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin, requireUser } from "@/lib/auth";
import { buildingSchema } from "@/lib/location";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    const { id } = await params;
    const b = await prisma.building.findUnique({
      where: { id },
      include: {
        floors: { orderBy: { floorNumber: "asc" } },
      },
    });
    if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ building: b });
  } catch (e) {
    return errRes(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const parsed = buildingSchema.partial().parse(body);
    const before = await prisma.building.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const after = await prisma.building.update({ where: { id }, data: parsed });
    await audit({ actorId: admin.id, action: "UPDATE", entity: "building", entityId: id, before, after });
    return NextResponse.json({ building: after });
  } catch (e) {
    return errRes(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    // Refuse if any asset still references this building via a floor.
    const assetCount = await prisma.asset.count({
      where: { floor: { buildingId: id } },
    });
    if (assetCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete building: ${assetCount} asset(s) still located here. Reassign or archive them first.`,
        },
        { status: 409 }
      );
    }
    const before = await prisma.building.findUnique({ where: { id } });
    await prisma.building.delete({ where: { id } });
    await audit({ actorId: admin.id, action: "DELETE", entity: "building", entityId: id, before });
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
