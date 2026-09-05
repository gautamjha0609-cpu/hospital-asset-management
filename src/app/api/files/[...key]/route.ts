import { NextRequest, NextResponse } from "next/server";
import { AuthzError, requireUser } from "@/lib/auth";
import { storage } from "@/lib/storage";

type Ctx = { params: Promise<{ key: string[] }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    const { key } = await params;
    const path = key.join("/");
    const buf = await storage().get(path);
    if (!buf) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Content-Type is best-effort by extension; browsers do fine with these.
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const type = mimeFor(ext);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function mimeFor(ext: string) {
  switch (ext) {
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    case "pdf": return "application/pdf";
    case "doc": return "application/msword";
    case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls": return "application/vnd.ms-excel";
    case "xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default: return "application/octet-stream";
  }
}
