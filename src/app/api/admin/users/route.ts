import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().max(120).optional().nullable(),
  role: z.enum(["ADMIN", "USER"]),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = createSchema.parse(await req.json());
    const passwordHash = await bcrypt.hash(body.password, 10);
    const email = body.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already exists." }, { status: 409 });
    const user = await prisma.user.create({
      data: { email, passwordHash, role: body.role, name: body.name ?? null },
    });
    await audit({ actorId: admin.id, action: "PERMISSION", entity: "user", entityId: user.id, after: { role: user.role, email: user.email } });
    return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name } }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: "Validation failed", issues: (e as { issues: unknown }).issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
