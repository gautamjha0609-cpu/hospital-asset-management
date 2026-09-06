"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, XCircle } from "lucide-react";

type Building = {
  id: string;
  name: string;
  floors: {
    id: string;
    name: string;
    rooms: { id: string; name: string; code: string }[];
  }[];
};

export function BulkAssign({
  selectedIds,
  buildings,
  onDone,
}: {
  selectedIds: string[];
  buildings: Building[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [buildingId, setBuildingId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const floors = useMemo(
    () => buildings.find((b) => b.id === buildingId)?.floors ?? [],
    [buildingId, buildings]
  );
  const rooms = useMemo(
    () => floors.find((f) => f.id === floorId)?.rooms ?? [],
    [floorId, floors]
  );
  useEffect(() => setFloorId(""), [buildingId]);
  useEffect(() => setRoomId(""), [floorId]);

  async function submit(unassign = false) {
    setError(null);
    setMsg(null);
    setBusy(true);
    const res = await fetch("/api/assets/bulk-assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetIds: selectedIds,
        roomId: unassign ? null : roomId || null,
        reason: reason || (unassign ? "Bulk unassign" : "Bulk assignment"),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Bulk update failed.");
      return;
    }
    const j = await res.json();
    setMsg(`${j.moved} of ${j.requested} moved.`);
    onDone();
    router.refresh();
  }

  return (
    <div className="card p-3 grid gap-2 md:grid-cols-[repeat(4,1fr)_auto] items-end">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Building</label>
        <select className="input" value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
          <option value="">—</option>
          {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Floor</label>
        <select className="input" value={floorId} onChange={(e) => setFloorId(e.target.value)} disabled={!buildingId}>
          <option value="">—</option>
          {floors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Room</label>
        <select className="input" value={roomId} onChange={(e) => setRoomId(e.target.value)} disabled={!floorId}>
          <option value="">—</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Reason (optional)</label>
        <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Initial physical placement" />
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-secondary" type="button" onClick={() => submit(true)} disabled={busy}>
          <XCircle className="h-4 w-4" /> Unassign
        </button>
        <button className="btn-primary" type="button" onClick={() => submit(false)} disabled={busy || !roomId}>
          <MapPin className="h-4 w-4" /> Assign to room
        </button>
      </div>
      {error && <div className="md:col-span-5 text-sm text-red-600">{error}</div>}
      {msg && <div className="md:col-span-5 text-sm text-emerald-700">{msg}</div>}
    </div>
  );
}
