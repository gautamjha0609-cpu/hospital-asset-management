"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Plus, X } from "lucide-react";

type Room = { id: string; name: string; code: string; floorName?: string; buildingName?: string };

export function ExpectedRoomsEditor(props: {
  assetPublicId: string;
  initialRoomIds: string[];
  roomsById: Record<string, Room>;
  canEdit: boolean;
  allRooms: Room[];
}) {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>(props.initialRoomIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState("");

  const chosen = ids.map((id) => props.roomsById[id]).filter(Boolean);
  const options = useMemo(() => {
    const q = search.trim().toLowerCase();
    return props.allRooms
      .filter((r) => !ids.includes(r.id))
      .filter((r) => !q || `${r.name} ${r.code} ${r.buildingName ?? ""} ${r.floorName ?? ""}`.toLowerCase().includes(q))
      .slice(0, 25);
  }, [props.allRooms, ids, search]);

  async function save(next: string[]) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/assets/${props.assetPublicId}/expected-rooms`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomIds: next }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Save failed.");
      return;
    }
    setIds(next);
    router.refresh();
  }

  return (
    <div>
      {chosen.length === 0 ? (
        <p className="text-sm text-gray-500">
          {props.canEdit
            ? "No expected rooms set. Add rooms where staff should look for this asset."
            : "No expected rooms set."}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {chosen.map((r) => (
            <li key={r.id}>
              <span className="tag inline-flex items-center gap-1">
                <Link href={`/rooms/${r.id}`} className="hover:underline">
                  {r.buildingName ? `${r.buildingName} · ` : ""}{r.name}
                </Link>
                {props.canEdit && (
                  <button
                    type="button"
                    aria-label="Remove"
                    className="text-gray-500 hover:text-red-600"
                    onClick={() => save(ids.filter((x) => x !== r.id))}
                    disabled={busy}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {props.canEdit && (
        <div className="mt-3">
          {!picker ? (
            <button className="btn-secondary" onClick={() => setPicker(true)}>
              <Plus className="h-4 w-4" /> Add expected room
            </button>
          ) : (
            <div className="card p-3 space-y-2">
              <input
                autoFocus
                className="input"
                placeholder="Search a room by name / code / building…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <ul className="max-h-64 overflow-auto divide-y divide-gray-100">
                {options.map((r) => (
                  <li key={r.id}>
                    <button
                      className="w-full text-left py-1.5 px-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                      onClick={() => {
                        save([...ids, r.id]);
                        setPicker(false);
                        setSearch("");
                      }}
                    >
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span>{r.name}</span>
                      <span className="text-xs text-gray-500">
                        {r.code}{r.buildingName ? ` · ${r.buildingName}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
                {options.length === 0 && (
                  <li className="py-2 px-2 text-xs text-gray-500">No matching rooms.</li>
                )}
              </ul>
              <div className="flex justify-end">
                <button className="btn-ghost text-xs" onClick={() => setPicker(false)}>Close</button>
              </div>
            </div>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
