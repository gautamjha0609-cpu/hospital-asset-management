import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  type: z.enum(["TEXT","NUMBER","DATE","CURRENCY","BOOLEAN","DROPDOWN","MULTI_SELECT","URL","LONG_TEXT"]),
  required: z.boolean().default(false),
  options: z.array(z.string()).nullable().optional(),
  displayOrder: z.number().int().optional(),
  appliesToCategory: z.string().max(120).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = createSchema.parse(await req.json());
    const rec = await prisma.customField.create({
      data: {
        name: body.name,
        label: body.label,
        type: body.type,
        required: body.required,
        options: body.options ? JSON.stringify(body.options) : null,
        displayOrder: body.displayOrder ?? 0,
        appliesToCategory: body.appliesToCategory ?? null,
      },
    });
    await audit({ actorId: admin.id, action: "CREATE", entity: "custom_field", entityId: rec.id, after: rec });
    return NextResponse.json({ field: rec }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e && typeof e === "object" && "issues" in e) {
      return NextResponse.json({ error: "Validation failed", issues: (e as { issues: unknown }).issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
