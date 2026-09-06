import { randomBytes, createHash } from "node:crypto";
import { prisma } from "./prisma";
import { env } from "./env";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_ACTIVE_TOKENS_PER_USER = 5;

export function newRawToken() {
  // 32 bytes = 43 chars base64url. Wide enough that guessing is infeasible.
  return randomBytes(32).toString("base64url");
}

export function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function resetLink(rawToken: string) {
  const base = env.PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

// Issue a new token for the user. Invalidates any prior unused tokens
// so a leaked/older link stops working the moment a new one is issued.
export async function issueResetToken(userId: string, ip?: string | null) {
  const raw = newRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  // Soft-invalidate previous unused tokens for this user.
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt, createdIp: ip ?? null },
  });

  // Trim history if the user has been abusing the endpoint.
  const stale = await prisma.passwordResetToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: MAX_ACTIVE_TOKENS_PER_USER,
    select: { id: true },
  });
  if (stale.length) {
    await prisma.passwordResetToken.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  }

  return { raw, link: resetLink(raw), expiresAt };
}

// Verify a raw token — returns the userId or null.
export async function consumeResetToken(raw: string): Promise<string | null> {
  const tokenHash = hashToken(raw);
  const rec = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!rec) return null;
  if (rec.usedAt) return null;
  if (rec.expiresAt.getTime() < Date.now()) return null;
  await prisma.passwordResetToken.update({
    where: { id: rec.id },
    data: { usedAt: new Date() },
  });
  return rec.userId;
}

// Look up (without consuming) so the reset page can pre-validate before
// showing the form. Returns { valid, email?, expiresAt? }.
export async function inspectResetToken(raw: string) {
  const tokenHash = hashToken(raw);
  const rec = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { email: true } } },
  });
  if (!rec) return { valid: false as const, reason: "unknown" as const };
  if (rec.usedAt) return { valid: false as const, reason: "used" as const };
  if (rec.expiresAt.getTime() < Date.now()) return { valid: false as const, reason: "expired" as const };
  return {
    valid: true as const,
    email: rec.user.email,
    expiresAt: rec.expiresAt,
  };
}
