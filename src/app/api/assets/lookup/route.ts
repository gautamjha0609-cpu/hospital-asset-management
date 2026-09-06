import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireUser } from "@/lib/auth";

// Best-effort lookup for a scanned value or a typed tag.
//   ?q=<full absolute URL>         -> extract publicId from /assets/<id>
//   ?q=<tag code>                  -> match Asset.tagCode
//   ?q=<publicId>                  -> match Asset.publicId
//   ?q=<workbookRowId as number>   -> match Asset.workbookRowId
//   ?q=<serial or barcode>         -> match either
// Returns { asset } with { id, publicId, name, description, tagCode } or 404.
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const raw = (req.nextUrl.searchParams.get("q") ?? "").trim();
    if (!raw) return NextResponse.json({ error: "q required" }, { status: 400 });

    // If the scanned value is a URL, extract the last path segment after /assets/
    let candidate = raw;
    try {
      const u = new URL(raw);
      const m = u.pathname.match(/\/assets\/([^/?#]+)/);
      if (m) candidate = decodeURIComponent(m[1]);
    } catch {
      /* not a URL — use raw */
    }

    const asNumber = /^\d+$/.test(candidate) ? Number(candidate) : null;

    const asset = await prisma.asset.findFirst({
      where: {
        OR: [
          { publicId: candidate },
          { tagCode: candidate },
          { barcode: candidate },
          { serialNumber: candidate },
          ...(asNumber != null ? [{ workbookRowId: asNumber }] : []),
        ],
      },
      select: {
        id: true,
        publicId: true,
        name: true,
        description: true,
        tagCode: true,
        status: true,
        roomId: true,
        room: { select: { name: true, code: true } },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "No asset matches that value.", query: candidate }, { status: 404 });
    }
    return NextResponse.json({ asset });
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
