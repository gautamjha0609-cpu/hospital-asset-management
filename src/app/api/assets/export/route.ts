import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { AuthzError, requireUser } from "@/lib/auth";
import { exportAssetsToBuffer } from "@/lib/excel-export";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;

    const where: Prisma.AssetWhereInput = {};
    const onlyId = sp.get("onlyId");
    if (onlyId) where.OR = [{ id: onlyId }, { publicId: onlyId }];
    const q = sp.get("q")?.trim();
    if (q) {
      where.OR = [
        { tagCode: { contains: q } },
        { description: { contains: q } },
        { serialNumber: { contains: q } },
        { barcode: { contains: q } },
      ];
    }
    for (const k of ["majorCategoryId","finalCategoryId","subCategoryId","departmentId","vendorId","assetType","status","roomId","floorId"] as const) {
      const v = sp.get(k);
      if (v) (where as Record<string, unknown>)[k] = v;
    }
    const buildingId = sp.get("buildingId");
    if (buildingId) where.floor = { buildingId };

    const buf = await exportAssetsToBuffer(where);
    await audit({ actorId: user.id, action: "EXPORT", entity: "asset", after: { size: buf.length } });

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="hospital-assets-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
