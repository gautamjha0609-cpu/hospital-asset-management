"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Actor = { id: string; email: string; name: string | null };
type Bucket = { value: string; count: number };

export function AuditFilters(props: { actors: Actor[]; actions: Bucket[]; entities: Bucket[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [entityId, setEntityId] = useState(sp.get("entityId") ?? "");
  useEffect(() => setQ(sp.get("q") ?? ""), [sp]);
  useEffect(() => setEntityId(sp.get("entityId") ?? ""), [sp]);

  function update(next: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    router.push(`/admin/audit?${params.toString()}`);
  }

  const active =
    sp.get("action") || sp.get("entity") || sp.get("actorId") || sp.get("q") || sp.get("from") || sp.get("to") || sp.get("entityId");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        update({ q: q || null, entityId: entityId || null });
      }}
      className="card p-3 grid gap-2 md:grid-cols-6"
    >
      <select
        className="input"
        value={sp.get("action") ?? ""}
        onChange={(e) => update({ action: e.target.value || null })}
      >
        <option value="">Any action</option>
        {props.actions.map((a) => (
          <option key={a.value} value={a.value}>
            {a.value} ({a.count})
          </option>
        ))}
      </select>
      <select
        className="input"
        value={sp.get("entity") ?? ""}
        onChange={(e) => update({ entity: e.target.value || null })}
      >
        <option value="">Any entity</option>
        {props.entities.map((e) => (
          <option key={e.value} value={e.value}>
            {e.value} ({e.count})
          </option>
        ))}
      </select>
      <select
        className="input"
        value={sp.get("actorId") ?? ""}
        onChange={(e) => update({ actorId: e.target.value || null })}
      >
        <option value="">Any actor</option>
        {props.actors.map((a) => (
          <option key={a.id} value={a.id}>
            {a.email}
          </option>
        ))}
      </select>
      <input
        className="input"
        placeholder="Entity ID"
        value={entityId}
        onChange={(e) => setEntityId(e.target.value)}
      />
      <input
        type="date"
        className="input"
        value={sp.get("from") ?? ""}
        onChange={(e) => update({ from: e.target.value || null })}
      />
      <input
        type="date"
        className="input"
        value={sp.get("to") ?? ""}
        onChange={(e) => update({ to: e.target.value || null })}
      />
      <input
        className="input md:col-span-4"
        placeholder="Search details (before/after JSON)…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button className="btn-primary md:col-span-1" type="submit">Apply</button>
      {active ? (
        <button
          type="button"
          className="btn-ghost md:col-span-1"
          onClick={() => router.push("/admin/audit")}
        >
          Clear
        </button>
      ) : (
        <span className="md:col-span-1" />
      )}
    </form>
  );
}
