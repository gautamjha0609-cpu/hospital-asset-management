import { prisma } from "./prisma";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "MOVE"
  | "IMPORT"
  | "EXPORT"
  | "LOGIN"
  | "PERMISSION"
  | "MAP_EDIT";

export async function audit(input: {
  actorId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        before: input.before ? JSON.stringify(input.before) : null,
        after: input.after ? JSON.stringify(input.after) : null,
      },
    });
  } catch (err) {
    // Auditing must never take down the caller.
    console.error("audit failed", err);
  }
}
