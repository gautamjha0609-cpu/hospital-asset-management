"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ASSET_STATUSES, ASSET_TYPES } from "@/lib/asset";
import { ROOM_TYPES, ROOM_TYPE_LABEL } from "@/lib/location";

type Opt = { id: string; name: string };
type Building = {
  id: string;
  name: string;
  floors: {
    id: string;
    name: string;
    rooms: { id: string; name: string; code: string }[];
  }[];
};

export function AssetFilters(props: {
  majors: Opt[];
  finals: Opt[];
  departments: Opt[];
  buildings: Building[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");

  useEffect(() => setQ(sp.get("q") ?? ""), [sp]);

  function update(next: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    router.push(`/assets?${params.toString()}`);
  }

  const buildingId = sp.get("buildingId") ?? "";
  const floorId = sp.get("floorId") ?? "";
  const roomId = sp.get("roomId") ?? "";
  const roomType = sp.get("roomType") ?? "";

  const floors = useMemo(
    () => props.buildings.find((b) => b.id === buildingId)?.floors ?? [],
    [buildingId, props.buildings]
  );
  const rooms = useMemo(
    () => floors.find((f) => f.id === floorId)?.rooms ?? [],
    [floorId, floors]
  );

  const hasAny =
    q ||
    sp.get("majorCategoryId") ||
    sp.get("finalCategoryId") ||
    sp.get("departmentId") ||
    buildingId ||
    floorId ||
    roomId ||
    roomType ||
    sp.get("assetType") ||
    sp.get("status");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        update({ q: q || null });
      }}
      className="card p-3 grid gap-2 md:grid-cols-6"
    >
      <input
        className="input md:col-span-2"
        placeholder="Search: tag, name, description, serial, barcode…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <select
        className="input"
        value={sp.get("majorCategoryId") ?? ""}
        onChange={(e) => update({ majorCategoryId: e.target.value || null })}
      >
        <option value="">All major categories</option>
        {props.majors.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <select
        className="input"
        value={sp.get("finalCategoryId") ?? ""}
        onChange={(e) => update({ finalCategoryId: e.target.value || null })}
      >
        <option value="">All final categories</option>
        {props.finals.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <select
        className="input"
        value={sp.get("departmentId") ?? ""}
        onChange={(e) => update({ departmentId: e.target.value || null })}
      >
        <option value="">All departments</option>
        {props.departments.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>

      <select
        className="input"
        value={buildingId}
        onChange={(e) => update({ buildingId: e.target.value || null, floorId: null, roomId: null })}
      >
        <option value="">All buildings</option>
        {props.buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <select
        className="input"
        value={floorId}
        disabled={!buildingId}
        onChange={(e) => update({ floorId: e.target.value || null, roomId: null })}
      >
        <option value="">All floors</option>
        {floors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      <select
        className="input"
        value={roomId}
        disabled={!floorId}
        onChange={(e) => update({ roomId: e.target.value || null })}
      >
        <option value="">All rooms</option>
        {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
      </select>
      <select
        className="input"
        value={roomType}
        onChange={(e) => update({ roomType: e.target.value || null })}
      >
        <option value="">Any area type</option>
        {ROOM_TYPES.map((t) => <option key={t} value={t}>{ROOM_TYPE_LABEL[t]}</option>)}
      </select>

      <select
        className="input"
        value={sp.get("assetType") ?? ""}
        onChange={(e) => update({ assetType: e.target.value || null })}
      >
        <option value="">Any movability</option>
        {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <select
        className="input"
        value={sp.get("status") ?? ""}
        onChange={(e) => update({ status: e.target.value || null })}
      >
        <option value="">Any status</option>
        {ASSET_STATUSES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>

      <div className="md:col-span-6 flex items-center gap-2">
        <button className="btn-primary" type="submit">Search</button>
        {hasAny && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setQ("");
              router.push("/assets");
            }}
          >
            Clear all
          </button>
        )}
      </div>
    </form>
  );
}
