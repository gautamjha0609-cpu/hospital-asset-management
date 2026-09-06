import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireUser } from "@/lib/auth";
import { validatePassword } from "@/lib/password";
import { audit } from "@/lib/audit";

const body = z.object({
  current: z.string().min(1).max(200),
  next: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  try {
    const me = await requireUser();
    const parsed = body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

    const rule = validatePassword(parsed.data.next);
    if (rule) return NextResponse.json({ error: rule }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: me.id } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ok = await bcrypt.compare(parsed.data.current, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });

    const passwordHash = await bcrypt.hash(parsed.data.next, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    // Invalidate any outstanding password-reset tokens.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await audit({
      actorId: user.id,
      action: "PERMISSION",
      entity: "password_changed_self",
      entityId: user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
