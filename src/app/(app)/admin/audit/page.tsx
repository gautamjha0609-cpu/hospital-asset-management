import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { AuditFilters } from "@/components/AuditFilters";
import { AuditRow } from "@/components/AuditRow";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function AuditPage(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") redirect("/dashboard");
  const sp = await props.searchParams;

  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const where: Prisma.AuditLogWhereInput = {};
  if (sp.action) where.action = sp.action;
  if (sp.entity) where.entity = sp.entity;
  if (sp.entityId) where.entityId = sp.entityId;
  if (sp.actorId) where.actorId = sp.actorId;
  if (sp.q) {
    where.OR = [
      { after: { contains: sp.q } },
      { before: { contains: sp.q } },
      { entityId: { contains: sp.q } },
    ];
  }
  if (sp.from || sp.to) {
    where.createdAt = {};
    if (sp.from) where.createdAt.gte = new Date(sp.from);
    if (sp.to) where.createdAt.lte = new Date(sp.to);
  }

  const [logs, total, actors, actionCounts, entityCounts] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { email: true, name: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({
      orderBy: { email: "asc" },
      select: { id: true, email: true, name: true },
    }),
    prisma.auditLog.groupBy({ by: ["action"], _count: true }),
    prisma.auditLog.groupBy({ by: ["entity"], _count: true }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => {
    if (v && k !== "page") qs.set(k, v);
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Audit log</h1>
          <p className="text-sm text-gray-500">
            {total.toLocaleString("en-IN")} events
            {Object.entries(sp).length > 0 && " (filtered)"}
          </p>
        </div>
        <Link href="/admin/system" className="btn-secondary text-xs">
          Retention & storage →
        </Link>
      </header>

      <AuditFilters
        actors={actors}
        actions={actionCounts.map((a) => ({ value: a.action, count: a._count as unknown as number }))}
        entities={entityCounts.map((e) => ({ value: e.entity, count: e._count as unknown as number }))}
      />

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="w-40">When</th>
              <th className="w-40">Actor</th>
              <th className="w-24">Action</th>
              <th className="w-32">Entity</th>
              <th className="w-56">Entity ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <AuditRow key={l.id} log={{
                id: l.id,
                createdAt: l.createdAt.toISOString(),
                actor: l.actor,
                action: l.action,
                entity: l.entity,
                entityId: l.entityId,
                before: l.before,
                after: l.after,
              }} />
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                  No events match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div>Page {page} of {totalPages}</div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link className="btn-secondary" href={`/admin/audit?${qs.toString()}&page=${page - 1}`}>
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link className="btn-secondary" href={`/admin/audit?${qs.toString()}&page=${page + 1}`}>
                Next
              </Link>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Records older than the retention window are pruned nightly. See{" "}
        <Link href="/admin/system" className="text-brand-700 hover:underline">
          System health
        </Link>{" "}
        for the current setting.
      </p>
    </div>
  );
}
