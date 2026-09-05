"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ASSET_STATUSES, ASSET_TYPES } from "@/lib/asset";

type Opt = { id: string; name: string };

export function AssetFilters(props: {
  majors: Opt[];
  finals: Opt[];
  departments: Opt[];
  buildings: Opt[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");

  useEffect(() => setQ(sp.get("q") ?? ""), [sp]);

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/assets?${params.toString()}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        update("q", q || null);
      }}
      className="card p-3 grid gap-2 md:grid-cols-6"
    >
      <input
        className="input md:col-span-2"
        placeholder="Search: tag, description, serial, barcode…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <select
        className="input"
        value={sp.get("majorCategoryId") ?? ""}
        onChange={(e) => update("majorCategoryId", e.target.value || null)}
      >
        <option value="">All major categories</option>
        {props.majors.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <select
        className="input"
        value={sp.get("finalCategoryId") ?? ""}
        onChange={(e) => update("finalCategoryId", e.target.value || null)}
      >
        <option value="">All final categories</option>
        {props.finals.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <select
        className="input"
        value={sp.get("departmentId") ?? ""}
        onChange={(e) => update("departmentId", e.target.value || null)}
      >
        <option value="">All departments</option>
        {props.departments.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <select
        className="input"
        value={sp.get("buildingId") ?? ""}
        onChange={(e) => update("buildingId", e.target.value || null)}
      >
        <option value="">All buildings</option>
        {props.buildings.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <select
        className="input"
        value={sp.get("assetType") ?? ""}
        onChange={(e) => update("assetType", e.target.value || null)}
      >
        <option value="">Any type</option>
        {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <select
        className="input"
        value={sp.get("status") ?? ""}
        onChange={(e) => update("status", e.target.value || null)}
      >
        <option value="">Any status</option>
        {ASSET_STATUSES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <button className="btn-primary md:col-start-6">Search</button>
    </form>
  );
}
