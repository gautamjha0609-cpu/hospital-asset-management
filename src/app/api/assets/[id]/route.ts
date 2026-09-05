import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin, requireUser } from "@/lib/auth";
import { assetUpdateSchema } from "@/lib/asset";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// id can be either publicId or internal id.
async function findAsset(id: string) {
  return (
    (await prisma.asset.findUnique({
      where: { publicId: id },
      include: assetInclude(),
    })) ??
    (await prisma.asset.findUnique({
      where: { id },
      include: assetInclude(),
    }))
  );
}
function assetInclude() {
  return {
    majorCategory: true,
    finalCategory: true,
    subCategory: true,
    department: true,
    vendor: true,
    costCenter: true,
    room: {
      include: {
        floor: { include: { building: true } },
      },
    },
    floor: { include: { building: true } },
    images: true,
    documents: true,
    locationHistory: {
      orderBy: { movedAt: "desc" },
      take: 100,
      include: {
        room: { include: { floor: { include: { building: true } } } },
        movedBy: { select: { id: true, email: true, name: true } },
      },
    },
    statusHistory: {
      orderBy: { changedAt: "desc" },
      take: 100,
    },
    customFieldValues: {
      include: { field: true },
    },
    purchaseLine: true,
    depreciations: { orderBy: { fiscalYear: "asc" } },
    importMeta: true,
  } as const;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    const { id } = await params;
    const asset = await findAsset(id);
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ asset });
  } catch (e) {
    return errRes(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const before = await findAsset(id);
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const parsed = assetUpdateSchema.parse(body);

    const moved = parsed.roomId !== undefined && parsed.roomId !== before.roomId;
    const statusChanged = parsed.status && parsed.status !== before.status;

    const after = await prisma.asset.update({
      where: { id: before.id },
      data: {
        ...parsed,
        voucherDate: parsed.voucherDate ? new Date(parsed.voucherDate) : parsed.voucherDate === null ? null : undefined,
        effectiveCapitalizationDate: parsed.effectiveCapitalizationDate ? new Date(parsed.effectiveCapitalizationDate) : parsed.effectiveCapitalizationDate === null ? null : undefined,
        warrantyExpiry: parsed.warrantyExpiry ? new Date(parsed.warrantyExpiry) : parsed.warrantyExpiry === null ? null : undefined,
        updatedById: admin.id,
      },
      include: assetInclude(),
    });

    if (moved) {
      await prisma.assetLocationHistory.create({
        data: {
          assetId: before.id,
          buildingId: parsed.buildingId ?? after.floor?.buildingId ?? null,
          floorId: parsed.floorId ?? after.floorId,
          roomId: parsed.roomId ?? null,
          mapX: parsed.mapX ?? null,
          mapY: parsed.mapY ?? null,
          movedById: admin.id,
          reason: (body.moveReason as string) ?? null,
          notes: (body.moveNotes as string) ?? null,
        },
      });
      await audit({ actorId: admin.id, action: "MOVE", entity: "asset", entityId: before.id, before, after });
    }
    if (statusChanged) {
      await prisma.assetStatusHistory.create({
        data: {
          assetId: before.id,
          oldStatus: before.status,
          newStatus: parsed.status!,
          changedById: admin.id,
          reason: (body.statusReason as string) ?? null,
        },
      });
    }
    if (!moved) {
      await audit({ actorId: admin.id, action: "UPDATE", entity: "asset", entityId: before.id, before, after });
    }
    return NextResponse.json({ asset: after });
  } catch (e) {
    return errRes(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const before = await findAsset(id);
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Soft-delete pattern: mark INACTIVE, keep row for audit trail.
    const after = await prisma.asset.update({
      where: { id: before.id },
      data: { status: "INACTIVE", updatedById: admin.id },
    });
    await audit({ actorId: admin.id, action: "DELETE", entity: "asset", entityId: before.id, before, after });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errRes(e);
  }
}

function errRes(e: unknown) {
  if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e && typeof e === "object" && "issues" in e) {
    return NextResponse.json({ error: "Validation failed", issues: (e as { issues: unknown }).issues }, { status: 400 });
  }
  console.error(e);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
