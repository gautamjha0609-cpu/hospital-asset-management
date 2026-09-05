import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin, requireUser } from "@/lib/auth";
import { buildingSchema } from "@/lib/location";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    await requireUser();
    const buildings = await prisma.building.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { floors: true } },
      },
    });
    return NextResponse.json({ buildings });
  } catch (e) {
    return errRes(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const parsed = buildingSchema.parse(body);
    const created = await prisma.building.create({ data: parsed });
    await audit({
      actorId: admin.id,
      action: "CREATE",
      entity: "building",
      entityId: created.id,
      after: created,
    });
    return NextResponse.json({ building: created }, { status: 201 });
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
