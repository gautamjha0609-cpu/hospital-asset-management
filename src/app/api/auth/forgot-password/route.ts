import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueResetToken } from "@/lib/reset-token";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { audit } from "@/lib/audit";

const body = z.object({ email: z.string().email().max(320) });

export async function POST(req: NextRequest) {
  try {
    const parsed = body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });
    // NEVER leak whether the email exists — always return 200 with the
    // same generic message. If the account exists, we send/log the link
    // asynchronously.
    if (user) {
      const ip = req.headers.get("x-forwarded-for") ?? null;
      const { link } = await issueResetToken(user.id, ip);
      await audit({
        actorId: user.id,
        action: "PERMISSION",
        entity: "password_reset_request",
        entityId: user.id,
      });
      const emailBody = [
        `Hi ${user.name ?? user.email},`,
        "",
        "Someone requested a password reset for your RBH Assets account.",
        "If it wasn't you, ignore this email — the link expires in 1 hour and can only be used once.",
        "",
        "Reset link:",
        link,
        "",
        "— CK Birla Hospitals · Rukmani Birla Hospital",
      ].join("\n");
      // Don't block the response if email transport is slow — we log any error.
      const result = await sendEmail({
        to: user.email,
        subject: "Reset your RBH Assets password",
        text: emailBody,
      });
      if (!result.ok) {
        console.error("password reset email failed", result.error);
      }
    }
    return NextResponse.json({
      ok: true,
      // Hint tells the UI whether email will actually be delivered — the
      // page can then adapt its instructions. It does NOT leak whether
      // this specific email exists in the DB.
      deliveryConfigured: isEmailConfigured(),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
