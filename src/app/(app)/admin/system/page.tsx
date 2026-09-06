import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSystemStats, formatBytes } from "@/lib/system-stats";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Database, HardDrive, Shield } from "lucide-react";
import { RunRetentionButton } from "@/components/RunRetentionButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SystemPage() {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") redirect("/dashboard");

  const stats = await getSystemStats();

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">System health</h1>
        <p className="text-sm text-gray-500">
          Database size, plan usage, audit retention, and file counts.
        </p>
      </div>

      {/* Plan warning banner */}
      {stats.plan.warningLevel === "critical" && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div>
            <div className="font-medium">Postgres storage near the Vercel Hobby limit</div>
            <p>
              Database is {stats.plan.percentOfHobbyLimit?.toFixed(1)}% of the
              256 MB Hobby-plan cap. Upgrade to Vercel Pro (or migrate to
              Neon/Supabase free tier — 3 GB), or writes will start failing.
            </p>
          </div>
        </div>
      )}
      {stats.plan.warningLevel === "warn" && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div>
            <div className="font-medium">Approaching Vercel Hobby storage limit</div>
            <p>
              Database is at {stats.plan.percentOfHobbyLimit?.toFixed(1)}% of
              the 256 MB Hobby-plan cap. Plan to upgrade or migrate before
              it fills.
            </p>
          </div>
        </div>
      )}

      {/* Cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card icon={<Database className="h-4 w-4" />} label="Database size">
          <div className="text-2xl font-semibold">{formatBytes(stats.databaseSizeBytes)}</div>
          <div className="text-xs text-gray-500 mt-1">
            Provider: <span className="font-mono">{stats.provider}</span>
            {stats.databaseName && <> · <span className="font-mono">{stats.databaseName}</span></>}
          </div>
          {stats.plan.percentOfHobbyLimit != null && (
            <div className="mt-3">
              <div className="h-2 bg-gray-100 rounded overflow-hidden">
                <div
                  className={
                    stats.plan.warningLevel === "critical"
                      ? "h-2 bg-red-600"
                      : stats.plan.warningLevel === "warn"
                        ? "h-2 bg-amber-500"
                        : stats.plan.warningLevel === "watch"
                          ? "h-2 bg-brand-600"
                          : "h-2 bg-emerald-600"
                  }
                  style={{ width: `${Math.min(100, stats.plan.percentOfHobbyLimit)}%` }}
                />
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                {stats.plan.percentOfHobbyLimit.toFixed(1)}% of Vercel Hobby Postgres cap (256 MB)
              </div>
            </div>
          )}
        </Card>

        <Card icon={<Shield className="h-4 w-4" />} label="Audit log retention">
          <div className="text-2xl font-semibold">{stats.audit.retentionDays} days</div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.audit.total.toLocaleString("en-IN")} rows total ·
            oldest: {formatDate(stats.audit.oldest)}
          </div>
          <div className="text-xs mt-2">
            Next daily prune would remove{" "}
            <b>{stats.audit.wouldPruneCount.toLocaleString("en-IN")}</b> row(s)
            older than <span className="font-mono">{formatDate(stats.audit.wouldPruneOlderThan)}</span>.
          </div>
          <div className="mt-3">
            <RunRetentionButton />
          </div>
        </Card>

        <Card icon={<HardDrive className="h-4 w-4" />} label="Files">
          <div className="text-2xl font-semibold">
            {(stats.storage.imageCount + stats.storage.documentCount).toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.storage.imageCount.toLocaleString("en-IN")} images ·
            {" "}{stats.storage.documentCount.toLocaleString("en-IN")} documents
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            Stored in {process.env.STORAGE_DRIVER === "vercel-blob"
              ? "Vercel Blob"
              : "local disk (dev)"}. Vercel Blob free tier is 1 GB.
          </p>
        </Card>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Row counts</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Table</th>
              <th className="text-right">Rows</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(stats.tableCounts).map(([name, n]) => (
              <tr key={name}>
                <td className="font-mono text-xs">{name}</td>
                <td className="text-right font-medium">{n.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Monitoring</h2>
        <ul className="text-sm space-y-1">
          <li className="flex items-center gap-2">
            {process.env.SENTRY_DSN ? (
              <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Sentry connected</>
            ) : (
              <><AlertTriangle className="h-4 w-4 text-gray-400" /> Sentry not configured (set <code>SENTRY_DSN</code>)</>
            )}
          </li>
          <li className="flex items-center gap-2">
            {process.env.STORAGE_DRIVER === "vercel-blob" ? (
              <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Vercel Blob storage attached</>
            ) : (
              <><AlertTriangle className="h-4 w-4 text-amber-500" /> File storage is local disk (uploads won't survive redeploys on Vercel)</>
            )}
          </li>
          <li className="flex items-center gap-2">
            {process.env.EMAIL_DRIVER === "resend" ? (
              <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Email via Resend</>
            ) : (
              <><AlertTriangle className="h-4 w-4 text-gray-400" /> Email in console mode (admin reset links still work)</>
            )}
          </li>
          <li className="flex items-center gap-2">
            {process.env.CRON_SECRET ? (
              <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> CRON_SECRET set (manual prune allowed)</>
            ) : (
              <><AlertTriangle className="h-4 w-4 text-gray-400" /> CRON_SECRET not set — only Vercel-triggered cron can prune</>
            )}
          </li>
        </ul>
      </section>
    </div>
  );
}

function Card({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
        <div className="text-gray-400">{icon}</div>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
