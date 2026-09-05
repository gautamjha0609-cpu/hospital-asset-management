"use client";
import { useState } from "react";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function ImportUploader() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { summary: Record<string, number>; jobId?: string }>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("dryRun", String(dryRun));
    const res = await fetch("/api/admin/import", { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Import failed.");
      return;
    }
    const j = await res.json();
    setResult({ summary: j.summary, jobId: j.job?.id });
    router.refresh();
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            .xlsx file with an "Asset Detail" sheet
          </label>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="input"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          Dry run first
        </label>
        <button
          type="button"
          className="btn-primary"
          onClick={submit}
          disabled={!file || busy}
        >
          <Upload className="h-4 w-4" /> {busy ? "Working…" : dryRun ? "Validate" : "Import"}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900">
          <div className="flex items-center gap-2 mb-2 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            {dryRun ? "Dry run complete" : "Import complete"}
          </div>
          <ul className="grid grid-cols-2 md:grid-cols-6 gap-x-4 gap-y-1 text-xs">
            <li>Total rows: <strong>{result.summary.totalRows}</strong></li>
            <li>Imported: <strong>{result.summary.imported}</strong></li>
            <li>Updated: <strong>{result.summary.updated}</strong></li>
            <li>Skipped: <strong>{result.summary.skipped}</strong></li>
            <li>Duplicates: <strong>{result.summary.duplicates}</strong></li>
            <li>Errors: <strong>{result.summary.errorCount}</strong></li>
          </ul>
        </div>
      )}
    </div>
  );
}
