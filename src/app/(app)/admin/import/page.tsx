import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ImportUploader } from "@/components/ImportUploader";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const jobs = await prisma.importJob.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
    include: { actor: { select: { email: true, name: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Excel workbook</h1>
        <p className="text-sm text-gray-500 max-w-3xl">
          Upload an `.xlsx` file with an <code>Asset Detail</code> sheet. Run a
          dry-run first to see what will be imported/updated/skipped without
          touching the database. Existing location assignments and
          per-asset custom fields are preserved on re-import.
        </p>
      </div>

      <ImportUploader />

      <section className="card p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Recent imports</h2>
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>File</th>
              <th>Actor</th>
              <th>Status</th>
              <th>Rows</th>
              <th>Imported</th>
              <th>Updated</th>
              <th>Skipped</th>
              <th>Errors</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td className="text-xs">{formatDate(j.startedAt)}</td>
                <td className="text-xs">{j.filename}</td>
                <td className="text-xs">{j.actor?.email ?? "—"}</td>
                <td className="text-xs">{j.status}</td>
                <td className="text-xs">{j.totalRows}</td>
                <td className="text-xs">{j.imported}</td>
                <td className="text-xs">{j.updated}</td>
                <td className="text-xs">{j.skipped}</td>
                <td className="text-xs">{j.errorCount}</td>
                <td>
                  {j.errorCount > 0 && (
                    <Link className="text-xs text-brand-700 hover:underline" href={`/api/admin/import/${j.id}/errors`}>
                      Error report
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center text-sm text-gray-500 py-6">
                  No imports yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
