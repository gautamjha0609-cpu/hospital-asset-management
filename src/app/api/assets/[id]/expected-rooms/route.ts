import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

const payload = z.object({
  roomIds: z.array(z.string().min(1)).max(50),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = payload.parse(await req.json());
    const asset = await prisma.asset.findFirst({
      where: { OR: [{ id }, { publicId: id }] },
      select: { id: true, assetType: true, expectedRoomIds: true },
    });
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.asset.update({
      where: { id: asset.id },
      data: { expectedRoomIds: JSON.stringify(body.roomIds) },
    });

    await audit({
      actorId: admin.id,
      action: "UPDATE",
      entity: "asset_expected_rooms",
      entityId: asset.id,
      before: { expectedRoomIds: asset.expectedRoomIds },
      after: { expectedRoomIds: updated.expectedRoomIds },
    });
    return NextResponse.json({ ok: true, expectedRoomIds: body.roomIds });
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: "Validation failed", issues: (e as { issues: unknown }).issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
