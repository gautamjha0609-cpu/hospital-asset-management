import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { assetUrl } from "@/lib/env";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const asset = await prisma.asset.findFirst({
    where: { OR: [{ publicId: id }, { id }] },
    select: { publicId: true },
  });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const svg = await QRCode.toString(assetUrl(asset.publicId), {
    type: "svg",
    margin: 1,
    width: 320,
    errorCorrectionLevel: "M",
  });
  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8" },
  });
}
