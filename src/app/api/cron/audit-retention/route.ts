import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Prune old AuditLog rows. Called by Vercel cron on the schedule
// declared in vercel.json.
//
// Auth: two accepted signals —
//   1. `Authorization: Bearer <CRON_SECRET>` — set CRON_SECRET in Vercel
//      env; Vercel forwards it automatically for cron routes and also
//      lets you hit the endpoint yourself for a manual prune.
//   2. `x-vercel-cron: 1` header — Vercel adds this to genuine cron
//      invocations; useful if you'd rather not manage a secret.
// Anything else → 401.
export const runtime = "nodejs";

const RETENTION_DAYS = Math.max(
  1,
  Number(process.env.AUDIT_RETENTION_DAYS ?? 730)
);

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth === `Bearer ${secret}`) return true;
  }
  if (req.headers.get("x-vercel-cron") === "1") return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const deleted = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  const remaining = await prisma.auditLog.count();
  return NextResponse.json({
    ok: true,
    cutoff,
    retentionDays: RETENTION_DAYS,
    deleted: deleted.count,
    remaining,
  });
}

// Also accept POST so it can be called from a curl or the admin UI.
export const POST = GET;
