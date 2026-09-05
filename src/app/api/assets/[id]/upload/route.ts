import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { audit } from "@/lib/audit";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const asset = await prisma.asset.findFirst({ where: { OR: [{ publicId: id }, { id }] } });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "OTHER") as "INVOICE" | "PO" | "WARRANTY" | "MANUAL" | "CERTIFICATE" | "OTHER" | "IMAGE";
    if (!(file instanceof Blob)) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    const filename = (file as File).name ?? "upload";
    const mime = (file as File).type ?? "application/octet-stream";
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json({ error: `File type not allowed: ${mime}` }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 15 MB)" }, { status: 413 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = filename.split(".").pop() || "bin";
    const key = `assets/${asset.id}/${randomUUID()}.${ext}`;
    await storage().put(key, bytes, mime);

    if (kind === "IMAGE" || mime.startsWith("image/")) {
      const rec = await prisma.assetImage.create({
        data: {
          assetId: asset.id,
          filename,
          mimeType: mime,
          size: bytes.length,
          storagePath: key,
          uploadedById: admin.id,
        },
      });
      await audit({ actorId: admin.id, action: "UPDATE", entity: "asset_image", entityId: rec.id, after: { assetId: asset.id, filename, kind: "IMAGE" } });
      return NextResponse.json({ image: rec }, { status: 201 });
    }
    const rec = await prisma.assetDocument.create({
      data: {
        assetId: asset.id,
        kind,
        filename,
        mimeType: mime,
        size: bytes.length,
        storagePath: key,
        uploadedById: admin.id,
      },
    });
    await audit({ actorId: admin.id, action: "UPDATE", entity: "asset_document", entityId: rec.id, after: { assetId: asset.id, filename, kind } });
    return NextResponse.json({ document: rec }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
