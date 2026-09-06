"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Log = {
  id: string;
  createdAt: string;
  actor: { email: string; name: string | null } | null;
  action: string;
  entity: string;
  entityId: string | null;
  before: string | null;
  after: string | null;
};

export function AuditRow({ log }: { log: Log }) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!(log.before || log.after);
  const summary = (() => {
    const raw = log.after ?? log.before;
    if (!raw) return "";
    try {
      const obj = JSON.parse(raw);
      const parts: string[] = [];
      for (const k of ["name", "email", "code", "tagCode", "description", "reason", "total", "moved", "imported"]) {
        if (obj[k] != null) parts.push(`${k}=${String(obj[k]).slice(0, 40)}`);
      }
      return parts.slice(0, 3).join(" · ") || raw.slice(0, 100);
    } catch {
      return raw.slice(0, 100);
    }
  })();

  const when = new Date(log.createdAt);
  return (
    <>
      <tr>
        <td className="text-xs whitespace-nowrap">
          <div>{formatDate(when)}</div>
          <div className="text-[11px] text-gray-500">{when.toLocaleTimeString("en-IN")}</div>
        </td>
        <td className="text-xs">{log.actor?.email ?? <span className="text-gray-400">system</span>}</td>
        <td className="text-xs"><span className="tag">{log.action}</span></td>
        <td className="text-xs">{log.entity}</td>
        <td className="text-[11px] font-mono truncate max-w-56">{log.entityId ?? "—"}</td>
        <td className="text-xs">
          <button
            className="flex items-start gap-1 text-left w-full hover:bg-gray-50 rounded px-1 py-0.5"
            onClick={() => hasDetail && setOpen((v) => !v)}
            disabled={!hasDetail}
          >
            {hasDetail && (open ? <ChevronDown className="h-3 w-3 mt-0.5" /> : <ChevronRight className="h-3 w-3 mt-0.5" />)}
            <span className="text-gray-600 truncate">{summary || "—"}</span>
          </button>
        </td>
      </tr>
      {open && hasDetail && (
        <tr>
          <td colSpan={6} className="bg-gray-50 p-2">
            <div className="grid gap-2 md:grid-cols-2">
              {log.before && (
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Before</div>
                  <pre className="text-[11px] bg-white p-2 rounded border border-gray-200 overflow-x-auto max-h-64">{pretty(log.before)}</pre>
                </div>
              )}
              {log.after && (
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">After</div>
                  <pre className="text-[11px] bg-white p-2 rounded border border-gray-200 overflow-x-auto max-h-64">{pretty(log.after)}</pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function pretty(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
