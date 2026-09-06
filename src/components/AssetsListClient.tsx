"use client";
import { useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { displayName } from "@/lib/asset";
import { BulkAssign } from "@/components/BulkAssign";
import { CheckSquare, Square } from "lucide-react";

type Row = {
  id: string;
  publicId: string;
  name: string | null;
  tagCode: string | null;
  description: string;
  status: string;
  costGrossBlock: number;
  voucherDate: Date | string | null;
  majorCategory: { name: string } | null;
  finalCategory: { name: string } | null;
  department: { name: string } | null;
  vendor: { name: string } | null;
  room: {
    id: string;
    name: string;
    code: string;
    floor: { building: { name: string } | null } | null;
  } | null;
};

type Building = {
  id: string;
  name: string;
  floors: {
    id: string;
    name: string;
    rooms: { id: string; name: string; code: string }[];
  }[];
};

export function AssetsListClient({
  rows,
  buildings,
  canBulk,
}: {
  rows: Row[];
  buildings: Building[];
  canBulk: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  return (
    <div className="space-y-3">
      {canBulk && selected.size > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-600">
            {selected.size} selected
            <button
              type="button"
              className="ml-2 text-brand-700 hover:underline"
              onClick={() => setSelected(new Set())}
            >
              clear
            </button>
          </div>
          <BulkAssign
            selectedIds={Array.from(selected)}
            buildings={buildings}
            onDone={() => setSelected(new Set())}
          />
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              {canBulk && (
                <th className="w-8">
                  <button onClick={toggleAll} className="text-gray-500 hover:text-gray-900" aria-label="Select all">
                    {selected.size === rows.length && rows.length > 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
              )}
              <th>Tag</th>
              <th>Name</th>
              <th>Category</th>
              <th>Department</th>
              <th>Location</th>
              <th>Voucher date</th>
              <th>Cost</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const isSel = selected.has(a.id);
              return (
                <tr key={a.id} className={isSel ? "bg-brand-50/40" : ""}>
                  {canBulk && (
                    <td>
                      <button
                        onClick={() => toggle(a.id)}
                        className="text-gray-500 hover:text-gray-900"
                        aria-label={isSel ? "Unselect" : "Select"}
                      >
                        {isSel ? <CheckSquare className="h-4 w-4 text-brand-700" /> : <Square className="h-4 w-4" />}
                      </button>
                    </td>
                  )}
                  <td className="font-mono text-xs">{a.tagCode ?? "—"}</td>
                  <td className="max-w-md">
                    <Link href={`/assets/${a.publicId}`} className="text-brand-700 hover:underline font-medium">
                      {displayName(a)}
                    </Link>
                    {a.name && a.name !== a.description && (
                      <div className="text-[11px] text-gray-500 truncate">{a.description}</div>
                    )}
                  </td>
                  <td className="text-xs">
                    <div>{a.majorCategory?.name}</div>
                    <div className="text-gray-500">{a.finalCategory?.name}</div>
                  </td>
                  <td className="text-xs">{a.department?.name ?? "—"}</td>
                  <td className="text-xs">
                    {a.room ? (
                      <Link className="text-brand-700 hover:underline" href={`/rooms/${a.room.id}`}>
                        {a.room.floor?.building?.name} · {a.room.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-xs">{formatDate(a.voucherDate)}</td>
                  <td className="text-xs">{formatCurrency(a.costGrossBlock)}</td>
                  <td>
                    <span className={statusTag(a.status)}>{a.status}</span>
                  </td>
                  <td className="text-right">
                    <Link href={`/assets/${a.publicId}`} className="text-xs text-brand-600 hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={canBulk ? 10 : 9} className="py-8 text-center text-sm text-gray-500">
                  No assets match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statusTag(s: string) {
  switch (s) {
    case "ACTIVE": return "tag-green";
    case "INACTIVE": return "tag";
    case "CONDEMNED": return "tag-red";
    case "WIP": return "tag-amber";
    case "UNDER_REPAIR": return "tag-amber";
    case "LOST": return "tag-red";
    default: return "tag";
  }
}
