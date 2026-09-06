"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X, ArrowRightLeft, AlertTriangle, Wrench, Camera, Save, Plus } from "lucide-react";
import { displayName } from "@/lib/asset";
import { formatDate } from "@/lib/utils";

type Asset = {
  id: string;
  publicId: string;
  name: string | null;
  description: string;
  tagCode: string | null;
  status: string;
  lastVerifiedAt: Date | string | null;
};

type Outcome = "PRESENT" | "MISSING" | "MOVED" | "CONDEMNED" | "UNDER_REPAIR";

type Draft = {
  outcome: Outcome | null;
  notes: string;
  photoPath: string | null;
  movedToRoomId: string | null;
};

export function VerifyClient(props: {
  room: { id: string; name: string; code: string; floorName: string };
  assets: Asset[];
  roomsOnFloor: { id: string; name: string; code: string }[];
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [extraQ, setExtraQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSummary, setSavedSummary] = useState<null | {
    present: number;
    missing: number;
    moved: number;
    condemned: number;
    total: number;
  }>(null);
  const [assets, setAssets] = useState<Asset[]>(props.assets);

  const marked = useMemo(
    () => Object.values(drafts).filter((d) => d.outcome).length,
    [drafts]
  );

  function set(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => {
      const base: Draft = prev[id] ?? {
        outcome: null,
        notes: "",
        photoPath: null,
        movedToRoomId: null,
      };
      return { ...prev, [id]: { ...base, ...patch } };
    });
  }

  async function addByScan() {
    const q = extraQ.trim();
    if (!q) return;
    setError(null);
    try {
      const res = await fetch(`/api/assets/lookup?q=${encodeURIComponent(q)}`);
      if (res.status === 404) {
        setError(`No asset matches "${q}".`);
        return;
      }
      if (!res.ok) {
        setError("Lookup failed.");
        return;
      }
      const j = await res.json();
      const a = j.asset as Asset;
      if (assets.find((x) => x.id === a.id)) {
        setError(`${displayName(a)} is already in the list.`);
        return;
      }
      setAssets((prev) => [...prev, a]);
      // If the asset was in another room and is now scanned here, pre-mark it PRESENT (will trigger a MOVE-in on save).
      set(a.id, { outcome: "PRESENT" });
      setExtraQ("");
    } catch (e) {
      setError(String(e));
    }
  }

  async function uploadPhoto(assetId: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "IMAGE");
    const res = await fetch(`/api/assets/${assetId}/upload`, { method: "POST", body: fd });
    if (!res.ok) {
      setError("Photo upload failed.");
      return;
    }
    const j = await res.json();
    set(assetId, { photoPath: j.image?.storagePath ?? null });
  }

  async function save() {
    setError(null);
    setBusy(true);
    const items = Object.entries(drafts)
      .filter(([, d]) => d.outcome)
      .map(([assetId, d]) => ({
        assetId,
        outcome: d.outcome!,
        notes: d.notes || null,
        photoPath: d.photoPath ?? null,
        movedToRoomId: d.outcome === "MOVED" ? d.movedToRoomId : null,
      }));
    if (items.length === 0) {
      setBusy(false);
      setError("Mark at least one asset before saving.");
      return;
    }
    const res = await fetch("/api/verifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: props.room.id, items }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Save failed.");
      return;
    }
    const j = await res.json();
    setSavedSummary(j.summary);
    setDrafts({});
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="card p-3 flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-600">
          {marked} of {assets.length} marked
        </span>
        <div className="flex-1" />
        <button
          disabled={busy || marked === 0}
          onClick={save}
          className="btn-primary"
        >
          <Save className="h-4 w-4" /> {busy ? "Saving…" : `Save (${marked})`}
        </button>
      </div>

      <div className="card p-3 flex items-center gap-2">
        <Plus className="h-4 w-4 text-gray-400" />
        <input
          className="input flex-1"
          placeholder="Scan / type a tag not in this list to add it"
          value={extraQ}
          onChange={(e) => setExtraQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addByScan();
            }
          }}
        />
        <button className="btn-secondary" onClick={addByScan} disabled={!extraQ.trim()}>
          Add
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {savedSummary && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Saved. Present: <b>{savedSummary.present}</b> · Missing: <b>{savedSummary.missing}</b> · Moved: <b>{savedSummary.moved}</b> · Condemned: <b>{savedSummary.condemned}</b>.
        </div>
      )}

      <ul className="space-y-2">
        {assets.map((a) => {
          const draft = drafts[a.id] ?? { outcome: null, notes: "", photoPath: null, movedToRoomId: null };
          return (
            <li key={a.id} className="card p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Link href={`/assets/${a.publicId}`} className="text-brand-700 font-medium hover:underline">
                    {displayName(a)}
                  </Link>
                  <div className="text-[11px] text-gray-500 truncate">
                    {a.tagCode ? `Tag ${a.tagCode} · ` : ""}
                    {a.status}
                    {a.lastVerifiedAt && ` · last verified ${formatDate(a.lastVerifiedAt)}`}
                  </div>
                </div>
                <span className={outcomeBadge(draft.outcome)}>{draft.outcome ?? "Not marked"}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-1 text-xs">
                <OutcomeButton current={draft.outcome} value="PRESENT" onClick={(v) => set(a.id, { outcome: v })} icon={<Check className="h-4 w-4" />} label="Present" tone="green" />
                <OutcomeButton current={draft.outcome} value="MISSING" onClick={(v) => set(a.id, { outcome: v })} icon={<X className="h-4 w-4" />} label="Missing" tone="red" />
                <OutcomeButton current={draft.outcome} value="MOVED" onClick={(v) => set(a.id, { outcome: v })} icon={<ArrowRightLeft className="h-4 w-4" />} label="Moved" tone="blue" />
                <OutcomeButton current={draft.outcome} value="CONDEMNED" onClick={(v) => set(a.id, { outcome: v })} icon={<AlertTriangle className="h-4 w-4" />} label="Condemn" tone="amber" />
                <OutcomeButton current={draft.outcome} value="UNDER_REPAIR" onClick={(v) => set(a.id, { outcome: v })} icon={<Wrench className="h-4 w-4" />} label="Repair" tone="amber" />
              </div>
              {draft.outcome === "MOVED" && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-600">Moved to room (same floor)</label>
                  <select
                    className="input"
                    value={draft.movedToRoomId ?? ""}
                    onChange={(e) => set(a.id, { movedToRoomId: e.target.value || null })}
                  >
                    <option value="">— pick a room —</option>
                    {props.roomsOnFloor.map((r) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                    ))}
                  </select>
                </div>
              )}
              {draft.outcome && draft.outcome !== "PRESENT" && (
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Notes (optional)</label>
                    <input
                      className="input"
                      value={draft.notes}
                      onChange={(e) => set(a.id, { notes: e.target.value })}
                      placeholder="e.g. 'Cannot locate. Last seen in ICU-04.'"
                    />
                  </div>
                  <label className="btn-secondary text-xs cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadPhoto(a.id, f);
                        e.target.value = "";
                      }}
                    />
                    <Camera className="h-4 w-4" /> {draft.photoPath ? "Replace photo" : "Add photo"}
                  </label>
                </div>
              )}
            </li>
          );
        })}
        {assets.length === 0 && (
          <li className="card p-6 text-center text-sm text-gray-500">
            No assets are currently assigned to this room. Scan tags above to add
            assets you find here and they'll be moved in when you save.
          </li>
        )}
      </ul>
    </div>
  );
}

function OutcomeButton({
  current,
  value,
  onClick,
  icon,
  label,
  tone,
}: {
  current: string | null;
  value: Outcome;
  onClick: (v: Outcome) => void;
  icon: React.ReactNode;
  label: string;
  tone: "green" | "red" | "blue" | "amber";
}) {
  const active = current === value;
  const bg = active
    ? {
        green: "bg-emerald-600 text-white hover:bg-emerald-700",
        red: "bg-red-600 text-white hover:bg-red-700",
        blue: "bg-brand-600 text-white hover:bg-brand-700",
        amber: "bg-amber-600 text-white hover:bg-amber-700",
      }[tone]
    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50";
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      aria-pressed={active}
      className={`btn ${bg} justify-center py-1.5`}
    >
      {icon}
      <span className="ml-1">{label}</span>
    </button>
  );
}

function outcomeBadge(o: string | null) {
  switch (o) {
    case "PRESENT": return "tag-green";
    case "MISSING": return "tag-red";
    case "MOVED": return "tag-blue";
    case "CONDEMNED": return "tag-red";
    case "UNDER_REPAIR": return "tag-amber";
    default: return "tag";
  }
}
