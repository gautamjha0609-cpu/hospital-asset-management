"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

// Manual prune button. Requires CRON_SECRET to hit the cron endpoint;
// admin pastes it once so the browser stores nothing sensitive.
export function RunRetentionButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setResult(null);
    const secret = prompt(
      "Enter CRON_SECRET to prune old audit logs now.\n\n(Set this in your Vercel project's Environment Variables.)"
    );
    if (!secret) return;
    setBusy(true);
    const res = await fetch("/api/cron/audit-retention", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.status === 401 ? "Wrong secret." : `Failed (${res.status}).`);
      return;
    }
    const j = await res.json();
    setResult(`Pruned ${j.deleted} row(s). ${j.remaining} remain.`);
    router.refresh();
  }

  return (
    <>
      <button className="btn-secondary text-xs" onClick={run} disabled={busy}>
        <Trash2 className="h-3.5 w-3.5" /> {busy ? "Working…" : "Run prune now"}
      </button>
      {result && <div className="mt-2 text-xs text-emerald-700">{result}</div>}
      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
    </>
  );
}
