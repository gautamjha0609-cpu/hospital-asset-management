import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") redirect("/dashboard");
  const sp = await props.searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const take = 100;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
      include: { actor: { select: { email: true, name: true } } },
    }),
    prisma.auditLog.count(),
  ]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-gray-500">Every admin change is recorded here.</p>
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="text-xs whitespace-nowrap">{formatDate(l.createdAt)}</td>
                <td className="text-xs">{l.actor?.email ?? "—"}</td>
                <td className="text-xs">{l.action}</td>
                <td className="text-xs">{l.entity}</td>
                <td className="text-xs font-mono">{l.entityId ?? "—"}</td>
                <td className="text-[11px] font-mono max-w-md truncate">{l.after ?? l.before ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-500">Total {total} events</div>
    </div>
  );
}
