import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin } from "@/lib/auth";
import { issueResetToken } from "@/lib/reset-token";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// Admin-initiated password reset. Unlike the public /forgot-password
// endpoint, this ALWAYS returns the link back to the admin so they can
// copy-paste it / WhatsApp it — the reset flow works even when email
// isn't configured, which is essential for a hospital deployment where
// admins never want to be locked out.
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const ip = req.headers.get("x-forwarded-for") ?? null;
    const { link, expiresAt } = await issueResetToken(target.id, ip);

    let emailResult: { delivered: string | null; error?: string } = { delivered: null };
    if (isEmailConfigured()) {
      const r = await sendEmail({
        to: target.email,
        subject: "Reset your RBH Assets password",
        text:
          `Hi ${target.name ?? target.email},\n\n` +
          `An admin has reset the password on your RBH Assets account.\n\n` +
          `Set a new password (link expires in 1 hour, single-use):\n${link}\n\n— CK Birla Hospitals · Rukmani Birla Hospital`,
      });
      emailResult = r.ok
        ? { delivered: r.delivered }
        : { delivered: null, error: r.error };
    }

    await audit({
      actorId: admin.id,
      action: "PERMISSION",
      entity: "password_reset_admin_issued",
      entityId: target.id,
      after: { email: target.email, emailedVia: emailResult.delivered },
    });

    return NextResponse.json({
      ok: true,
      link, // always returned so admin can hand it over if email isn't delivered
      expiresAt,
      email: target.email,
      emailed: emailResult.delivered !== null,
      emailError: emailResult.error ?? null,
    });
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
