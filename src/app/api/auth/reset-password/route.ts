import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeResetToken, inspectResetToken } from "@/lib/reset-token";
import { validatePassword } from "@/lib/password";
import { audit } from "@/lib/audit";

const body = z.object({
  token: z.string().min(10).max(500),
  password: z.string().min(8).max(200),
});

// GET: safely tell the reset-password page whether a token is valid /
// expired / used / unknown so it can render the right message.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false, reason: "missing" });
  const info = await inspectResetToken(token);
  if (!info.valid) {
    return NextResponse.json({ valid: false, reason: info.reason });
  }
  // Only the local part of the email — don't reveal the full address.
  const [local] = info.email.split("@");
  const maskedEmail =
    (local?.slice(0, 2) ?? "") + "***@" + info.email.split("@")[1];
  return NextResponse.json({ valid: true, maskedEmail, expiresAt: info.expiresAt });
}

export async function POST(req: NextRequest) {
  try {
    const parsed = body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const rule = validatePassword(parsed.data.password);
    if (rule) return NextResponse.json({ error: rule }, { status: 400 });

    const userId = await consumeResetToken(parsed.data.token);
    if (!userId) {
      return NextResponse.json(
        { error: "This reset link is invalid or has already been used. Request a new one." },
        { status: 400 }
      );
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    // Also invalidate any other outstanding tokens for this user.
    await prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await audit({
      actorId: userId,
      action: "PERMISSION",
      entity: "password_reset_completed",
      entityId: userId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
