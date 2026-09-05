"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function BuildingCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/buildings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code, address: address || null }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to create building.");
      return;
    }
    setName("");
    setCode("");
    setAddress("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-4 grid gap-3 md:grid-cols-4 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
        <input required className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Hospital Building" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
        <input required className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="MAIN" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">Address (optional)</label>
        <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-red-600 md:col-span-3">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary md:col-start-4">
        {busy ? "Creating…" : "Create building"}
      </button>
    </form>
  );
}
