"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, Package } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { displayName } from "@/lib/asset";

type Row = {
  id: string;
  publicId: string;
  name: string | null;
  description: string;
  tagCode: string | null;
  status: string;
  costGrossBlock: number;
  voucherDate: Date | string | null;
  vendor: { id: string; name: string } | null;
  majorCategory: { name: string } | null;
  finalCategory: { name: string } | null;
  subCategory: { name: string } | null;
  department: { name: string } | null;
  room: {
    id: string;
    name: string;
    code: string;
    floor: { building: { name: string } | null } | null;
  } | null;
  purchaseLine: {
    poNumber: string | null;
    poDate: Date | string | null;
    poQty: number | null;
    poVendorName: string | null;
    poCgstRate: number | null;
    poIgstRate: number | null;
  } | null;
};

type Group = { key: string; label: string; rows: Row[]; poNumber?: string | null };

export function GroupedAssetsClient({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(k: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  return (
    <div className="card overflow-hidden">
      <table className="table">
        <thead>
          <tr>
            <th className="w-6"></th>
            <th>Asset (grouped)</th>
            <th>Category</th>
            <th>Vendor</th>
            <th>Rooms</th>
            <th className="text-right">Units</th>
            <th className="text-right">Total cost</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const isOpen = open.has(g.key);
            const first = g.rows[0];
            const uniqueRooms = new Set(g.rows.map((r) => r.room?.id).filter(Boolean));
            const totalCost = g.rows.reduce((s, r) => s + (r.costGrossBlock ?? 0), 0);
            return (
              <>
                <tr key={g.key} className={isOpen ? "bg-brand-50/40" : ""}>
                  <td>
                    <button
                      onClick={() => toggle(g.key)}
                      aria-label={isOpen ? "Collapse" : "Expand"}
                      className="text-gray-500 hover:text-gray-900"
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => toggle(g.key)}
                      className="text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="font-medium">{g.label}</span>
                      </div>
                      {g.poNumber && (
                        <div className="text-[11px] text-gray-500">PO {g.poNumber} · {formatDate(first.purchaseLine?.poDate)}</div>
                      )}
                    </button>
                  </td>
                  <td className="text-xs">
                    <div>{first.majorCategory?.name}</div>
                    <div className="text-gray-500">{first.subCategory?.name ?? first.finalCategory?.name}</div>
                  </td>
                  <td className="text-xs">{first.vendor?.name ?? "—"}</td>
                  <td className="text-xs">
                    {uniqueRooms.size === 0
                      ? <span className="text-gray-400">Unassigned</span>
                      : uniqueRooms.size === 1
                        ? (first.room ? `${first.room.floor?.building?.name} · ${first.room.name}` : "—")
                        : `${uniqueRooms.size} rooms`}
                  </td>
                  <td className="text-right font-semibold">{g.rows.length}</td>
                  <td className="text-right text-xs">{formatCurrency(totalCost)}</td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={7} className="bg-gray-50 p-0">
                      <table className="table">
                        <thead>
                          <tr>
                            <th className="w-6"></th>
                            <th>Tag</th>
                            <th>Line item</th>
                            <th>Room</th>
                            <th>Voucher date</th>
                            <th>Cost</th>
                            <th>Status</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.rows.map((r, idx) => (
                            <tr key={r.id}>
                              <td className="text-[11px] text-gray-400 text-right pr-2">{idx + 1}</td>
                              <td className="font-mono text-xs">{r.tagCode ?? "—"}</td>
                              <td className="max-w-md">
                                <Link href={`/assets/${r.publicId}`} className="text-brand-700 hover:underline">
                                  {displayName(r)}
                                </Link>
                                {r.name && r.name !== r.description && (
                                  <div className="text-[11px] text-gray-500 truncate">{r.description}</div>
                                )}
                              </td>
                              <td className="text-xs">
                                {r.room ? (
                                  <Link className="text-brand-700 hover:underline" href={`/rooms/${r.room.id}`}>
                                    {r.room.floor?.building?.name} · {r.room.name}
                                  </Link>
                                ) : (
                                  <span className="text-gray-400">Unassigned</span>
                                )}
                              </td>
                              <td className="text-xs">{formatDate(r.voucherDate)}</td>
                              <td className="text-xs">{formatCurrency(r.costGrossBlock)}</td>
                              <td className="text-xs">{r.status}</td>
                              <td className="text-right">
                                <Link href={`/assets/${r.publicId}`} className="text-xs text-brand-600 hover:underline">Open</Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
          {groups.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center text-sm text-gray-500 py-8">
                No groups match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
