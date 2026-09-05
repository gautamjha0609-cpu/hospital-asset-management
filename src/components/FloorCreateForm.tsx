"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function FloorCreateForm({ buildingId }: { buildingId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [floorNumber, setFloorNumber] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/floors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buildingId, name, floorNumber, levelIndex: floorNumber }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to create floor.");
      return;
    }
    setName("");
    setFloorNumber(floorNumber + 1);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-4 grid gap-3 md:grid-cols-4 items-end">
      <div className="md:col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">Floor name</label>
        <input required className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ground Floor" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Floor number</label>
        <input required type="number" className="input" value={floorNumber} onChange={(e) => setFloorNumber(parseInt(e.target.value || "0", 10))} />
      </div>
      {error && <p role="alert" className="text-sm text-red-600 md:col-span-3">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary md:col-start-4">
        {busy ? "Adding…" : "Add floor"}
      </button>
    </form>
  );
}
