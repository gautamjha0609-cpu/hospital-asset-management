"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toSlug } from "@/lib/utils";

const TYPES = ["TEXT", "NUMBER", "DATE", "CURRENCY", "BOOLEAN", "DROPDOWN", "MULTI_SELECT", "URL", "LONG_TEXT"] as const;

export function CustomFieldForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("TEXT");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/admin/fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        name: toSlug(label),
        type,
        required,
        options: options
          ? options.split(",").map((s) => s.trim()).filter(Boolean)
          : null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to create field.");
      return;
    }
    setLabel(""); setOptions("");
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="card p-4 grid gap-3 md:grid-cols-5 items-end">
      <div className="md:col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
        <input required className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Biomedical calibration date" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
        <select className="input" value={type} onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm mt-6">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} /> Required
        </label>
      </div>
      <button className="btn-primary" disabled={busy}>{busy ? "Adding…" : "Add field"}</button>
      {(type === "DROPDOWN" || type === "MULTI_SELECT") && (
        <div className="md:col-span-5">
          <label className="block text-xs font-medium text-gray-600 mb-1">Options (comma-separated)</label>
          <input className="input" value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Yes, No, Under Review" />
        </div>
      )}
      {error && <p role="alert" className="md:col-span-5 text-sm text-red-600">{error}</p>}
    </form>
  );
}
