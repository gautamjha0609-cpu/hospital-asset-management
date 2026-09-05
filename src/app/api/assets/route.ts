import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin, requireUser } from "@/lib/auth";
import { assetCreateSchema } from "@/lib/asset";
import { audit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q")?.trim() ?? "";
    const buildingId = sp.get("buildingId");
    const floorId = sp.get("floorId");
    const roomId = sp.get("roomId");
    const majorCategoryId = sp.get("majorCategoryId");
    const finalCategoryId = sp.get("finalCategoryId");
    const subCategoryId = sp.get("subCategoryId");
    const departmentId = sp.get("departmentId");
    const vendorId = sp.get("vendorId");
    const assetType = sp.get("assetType");
    const status = sp.get("status");
    const purchaseYear = sp.get("purchaseYear");
    const skip = Math.max(0, parseInt(sp.get("skip") ?? "0", 10) || 0);
    const take = Math.min(200, Math.max(1, parseInt(sp.get("take") ?? "50", 10) || 50));

    const where: Prisma.AssetWhereInput = {};
    if (q) {
      where.OR = [
        { tagCode: { contains: q } },
        { description: { contains: q } },
        { serialNumber: { contains: q } },
        { modelNumber: { contains: q } },
        { barcode: { contains: q } },
        { voucherNumber: { contains: q } },
      ];
    }
    if (buildingId) where.floor = { buildingId };
    if (floorId) where.floorId = floorId;
    if (roomId) where.roomId = roomId;
    if (majorCategoryId) where.majorCategoryId = majorCategoryId;
    if (finalCategoryId) where.finalCategoryId = finalCategoryId;
    if (subCategoryId) where.subCategoryId = subCategoryId;
    if (departmentId) where.departmentId = departmentId;
    if (vendorId) where.vendorId = vendorId;
    if (assetType) where.assetType = assetType;
    if (status) where.status = status;
    if (purchaseYear && /^\d{4}$/.test(purchaseYear)) {
      const y = Number(purchaseYear);
      where.voucherDate = {
        gte: new Date(y, 0, 1),
        lt: new Date(y + 1, 0, 1),
      };
    }

    const [items, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip,
        take,
        include: {
          majorCategory: { select: { name: true } },
          finalCategory: { select: { name: true } },
          subCategory: { select: { name: true } },
          department: { select: { name: true } },
          vendor: { select: { name: true } },
          room: { select: { id: true, name: true, code: true, floor: { select: { id: true, name: true, building: { select: { id: true, name: true } } } } } },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    return NextResponse.json({ items, total, skip, take });
  } catch (e) {
    return errRes(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const parsed = assetCreateSchema.parse(body);

    const data: Prisma.AssetCreateInput = {
      description: parsed.description,
      tagCode: parsed.tagCode ?? null,
      outsourceFarCode: parsed.outsourceFarCode ?? null,
      assetType: parsed.assetType,
      status: parsed.status,
      condition: parsed.condition ?? null,
      assetClass: parsed.assetClass ?? null,
      tangibility: parsed.tangibility ?? null,
      capitalized: parsed.capitalized,
      costGrossBlock: parsed.costGrossBlock,
      netBlock: parsed.netBlock ?? null,
      voucherDate: parsed.voucherDate ? new Date(parsed.voucherDate) : null,
      voucherNumber: parsed.voucherNumber ?? null,
      effectiveCapitalizationDate: parsed.effectiveCapitalizationDate ? new Date(parsed.effectiveCapitalizationDate) : null,
      depreciationKey: parsed.depreciationKey ?? null,
      serialNumber: parsed.serialNumber ?? null,
      modelNumber: parsed.modelNumber ?? null,
      manufacturer: parsed.manufacturer ?? null,
      barcode: parsed.barcode ?? null,
      qrValue: parsed.qrValue ?? null,
      warrantyExpiry: parsed.warrantyExpiry ? new Date(parsed.warrantyExpiry) : null,
      plantCode: parsed.plantCode ?? null,
      glCode: parsed.glCode ?? null,
      mapX: parsed.mapX ?? null,
      mapY: parsed.mapY ?? null,
      createdBy: { connect: { id: admin.id } },
      updatedBy: { connect: { id: admin.id } },
    };
    if (parsed.majorCategoryId) data.majorCategory = { connect: { id: parsed.majorCategoryId } };
    if (parsed.finalCategoryId) data.finalCategory = { connect: { id: parsed.finalCategoryId } };
    if (parsed.subCategoryId) data.subCategory = { connect: { id: parsed.subCategoryId } };
    if (parsed.vendorId) data.vendor = { connect: { id: parsed.vendorId } };
    if (parsed.departmentId) data.department = { connect: { id: parsed.departmentId } };
    if (parsed.costCenterId) data.costCenter = { connect: { id: parsed.costCenterId } };
    if (parsed.floorId) data.floor = { connect: { id: parsed.floorId } };
    if (parsed.roomId) data.room = { connect: { id: parsed.roomId } };

    const created = await prisma.asset.create({ data });
    if (created.roomId || created.floorId) {
      await prisma.assetLocationHistory.create({
        data: {
          assetId: created.id,
          buildingId: parsed.buildingId ?? null,
          floorId: created.floorId,
          roomId: created.roomId,
          mapX: created.mapX,
          mapY: created.mapY,
          movedById: admin.id,
          reason: "Initial placement",
        },
      });
    }
    await audit({ actorId: admin.id, action: "CREATE", entity: "asset", entityId: created.id, after: created });
    return NextResponse.json({ asset: created }, { status: 201 });
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
