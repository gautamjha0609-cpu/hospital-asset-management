import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin, requireUser } from "@/lib/auth";
import { floorSchema } from "@/lib/location";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const buildingId = req.nextUrl.searchParams.get("buildingId");
    const where = buildingId ? { buildingId } : {};
    const floors = await prisma.floor.findMany({
      where,
      orderBy: [{ buildingId: "asc" }, { levelIndex: "asc" }, { floorNumber: "asc" }],
      include: {
        building: { select: { id: true, name: true, code: true } },
        _count: { select: { rooms: true, assets: true } },
      },
    });
    return NextResponse.json({ floors });
  } catch (e) {
    return errRes(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const parsed = floorSchema.parse(body);
    const created = await prisma.floor.create({ data: parsed });
    await audit({
      actorId: admin.id,
      action: "CREATE",
      entity: "floor",
      entityId: created.id,
      after: created,
    });
    return NextResponse.json({ floor: created }, { status: 201 });
  } catch (e) {
    return errRes(e);
  }
}

function errRes(e: unknown) {
  if (e instanceof AuthzError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  if (e && typeof e === "object" && "issues" in e) {
    return NextResponse.json({ error: "Validation failed", issues: (e as { issues: unknown }).issues }, { status: 400 });
  }
  console.error(e);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
