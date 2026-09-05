import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin, requireUser } from "@/lib/auth";
import { roomSchema } from "@/lib/location";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const floorId = req.nextUrl.searchParams.get("floorId");
    const where = floorId ? { floorId } : {};
    const rooms = await prisma.room.findMany({
      where,
      orderBy: { name: "asc" },
      include: { _count: { select: { assets: true } } },
    });
    return NextResponse.json({ rooms });
  } catch (e) {
    return errRes(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const parsed = roomSchema.parse(body);
    const created = await prisma.room.create({
      data: {
        floorId: parsed.floorId,
        name: parsed.name,
        code: parsed.code,
        type: parsed.type,
        description: parsed.description ?? null,
        geometry: JSON.stringify({ points: parsed.geometry.points }),
        labelX: parsed.labelX ?? null,
        labelY: parsed.labelY ?? null,
      },
    });
    await audit({
      actorId: admin.id,
      action: "CREATE",
      entity: "room",
      entityId: created.id,
      after: created,
    });
    return NextResponse.json({ room: created }, { status: 201 });
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
