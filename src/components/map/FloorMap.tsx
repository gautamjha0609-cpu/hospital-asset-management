"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MousePointer2,
  Square,
  Slash,
  DoorOpen,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Save,
  Move,
  Trash2,
  MapPin,
} from "lucide-react";
import {
  useMapStore,
  useMapUndo,
  type Point,
  type LocalRoom,
  type UnplacedAsset,
} from "./mapStore";
import { polygonCentroid, ROOM_TYPE_LABEL, ROOM_TYPES } from "@/lib/location";

type Props = {
  floorId: string;
  planWidth: number;
  planHeight: number;
  isAdmin: boolean;
  initialRooms: {
    id: string;
    name: string;
    code: string;
    type: string;
    geometry: string;
    labelX: number | null;
    labelY: number | null;
  }[];
  initialMapObjects: { id: string; kind: string; data: string }[];
  initialAssets: {
    id: string;
    publicId: string;
    label: string;
    status: string;
    x: number;
    y: number;
  }[];
  unplacedAssets: {
    id: string;
    publicId: string;
    label: string;
    status: string;
    roomId: string | null;
  }[];
  rooms: { id: string; name: string; code: string }[];
};

export function FloorMap(props: Props) {
  const router = useRouter();
  const {
    mode,
    setMode,
    zoom,
    setZoom,
    panX,
    panY,
    pan,
    resetView,
    rooms,
    mapObjects,
    assets,
    unplaced,
    draftPoints,
    addDraftPoint,
    cancelDraft,
    commitRoom,
    updateRoom,
    removeRoom,
    selectRoom,
    selectAsset,
    selectedRoomId,
    selectedAssetId,
    hydrate,
    addWall,
    removeObject,
    moveAsset,
    placeAsset,
  } = useMapStore();
  const undo = useMapUndo();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [wallStart, setWallStart] = useState<Point | null>(null);
  const [dragAssetId, setDragAssetId] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    hydrate({
      floorId: props.floorId,
      planWidth: props.planWidth,
      planHeight: props.planHeight,
      rooms: props.initialRooms.map((r) => {
        const geom = safeGeom(r.geometry);
        return {
          id: r.id,
          name: r.name,
          code: r.code,
          type: r.type,
          points: geom,
          labelX: r.labelX,
          labelY: r.labelY,
        };
      }),
      mapObjects: props.initialMapObjects.map((o) => ({
        id: o.id,
        kind: o.kind as never,
        data: safeJson(o.data),
      })),
      assets: props.initialAssets,
      unplaced: props.unplacedAssets,
    });
  }, [
    hydrate,
    props.floorId,
    props.planWidth,
    props.planHeight,
    props.initialRooms,
    props.initialMapObjects,
    props.initialAssets,
  ]);

  const [placingId, setPlacingId] = useState<string | null>(null);
  const viewBox = `0 0 ${props.planWidth} ${props.planHeight}`;
  const roomsById = useMemo(
    () => Object.fromEntries(props.rooms.map((r) => [r.id, r])),
    [props.rooms]
  );

  // Map screen coords -> svg coords
  function toSvg(evt: React.PointerEvent | React.MouseEvent): Point {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    // snap to 10px grid
    return { x: Math.round(local.x / 10) * 10, y: Math.round(local.y / 10) * 10 };
  }

  function onSvgClick(e: React.MouseEvent) {
    if (!props.isAdmin) return;
    const p = toSvg(e);
    if (placingId) {
      placeAsset(placingId, p.x, p.y);
      setPlacingId(null);
      return;
    }
    if (mode === "DRAW_ROOM") {
      addDraftPoint(p);
    } else if (mode === "DRAW_WALL") {
      if (!wallStart) setWallStart(p);
      else {
        addWall(wallStart, p);
        setWallStart(null);
      }
    }
  }

  function onSvgPointerDown(e: React.PointerEvent) {
    if (mode !== "SELECT") return;
    // Middle click or space+drag pans; here we do middle-click drag
    if (e.button === 1) {
      const start = { x: e.clientX, y: e.clientY };
      const move = (ev: PointerEvent) => {
        pan(ev.clientX - start.x, ev.clientY - start.y);
        start.x = ev.clientX;
        start.y = ev.clientY;
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    }
  }

  function finishDrawingRoom() {
    if (draftPoints.length < 3) {
      setSaveMsg("Need at least 3 points for a room.");
      return;
    }
    setShowRoomModal(true);
  }

  function onAssetPointerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    selectAsset(id);
    if (!props.isAdmin || mode !== "SELECT") return;
    setDragAssetId(id);
  }

  useEffect(() => {
    if (!dragAssetId) return;
    function onMove(e: PointerEvent) {
      const svg = svgRef.current;
      if (!svg) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const local = pt.matrixTransform(ctm.inverse());
      moveAsset(dragAssetId!, Math.round(local.x / 5) * 5, Math.round(local.y / 5) * 5);
    }
    function onUp() {
      setDragAssetId(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragAssetId, moveAsset]);

  async function save() {
    setSaving(true);
    setSaveMsg(null);
    const payload = {
      rooms: rooms.map((r) => ({
        id: r.isNew ? undefined : r.id,
        name: r.name,
        code: r.code,
        type: r.type,
        points: r.points,
        labelX: r.labelX ?? null,
        labelY: r.labelY ?? null,
      })),
      mapObjects: mapObjects.map((o) => ({
        id: o.isNew ? undefined : o.id,
        kind: o.kind,
        data: o.data,
      })),
      assets: assets.map((a) => ({ id: a.id, x: a.x, y: a.y })),
    };
    const res = await fetch(`/api/floors/${props.floorId}/map`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setSaveMsg(j.error ?? "Save failed.");
      return;
    }
    setSaveMsg("Saved.");
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      {/* Toolbar */}
      <div className="card p-2 flex flex-wrap items-center gap-2">
        {props.isAdmin && (
          <>
            <ToolButton
              active={mode === "SELECT"}
              onClick={() => setMode("SELECT")}
              label="Select"
              icon={<MousePointer2 className="h-4 w-4" />}
            />
            <ToolButton
              active={mode === "DRAW_ROOM"}
              onClick={() => setMode("DRAW_ROOM")}
              label="Draw room"
              icon={<Square className="h-4 w-4" />}
            />
            <ToolButton
              active={mode === "DRAW_WALL"}
              onClick={() => setMode("DRAW_WALL")}
              label="Draw wall"
              icon={<Slash className="h-4 w-4" />}
            />
            <ToolButton
              active={mode === "PLACE_DOOR"}
              onClick={() => setMode("PLACE_DOOR")}
              label="Door"
              icon={<DoorOpen className="h-4 w-4" />}
            />
            <div className="mx-1 h-6 w-px bg-gray-200" />
            <button className="btn-ghost" onClick={() => undo.getState().undo()} title="Undo">
              <Undo2 className="h-4 w-4" />
            </button>
            <button className="btn-ghost" onClick={() => undo.getState().redo()} title="Redo">
              <Redo2 className="h-4 w-4" />
            </button>
            <div className="mx-1 h-6 w-px bg-gray-200" />
          </>
        )}
        <button className="btn-ghost" onClick={() => setZoom(zoom * 1.2)} title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button className="btn-ghost" onClick={() => setZoom(zoom / 1.2)} title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </button>
        <button className="btn-ghost" onClick={resetView} title="Reset view">
          <Move className="h-4 w-4" />
        </button>
        <div className="flex-1" />
        {props.isAdmin && mode === "DRAW_ROOM" && (
          <>
            <button className="btn-secondary" onClick={cancelDraft} disabled={draftPoints.length === 0}>
              Cancel
            </button>
            <button className="btn-primary" onClick={finishDrawingRoom} disabled={draftPoints.length < 3}>
              Finish room ({draftPoints.length} pts)
            </button>
          </>
        )}
        {props.isAdmin && (
          <button className="btn-primary" onClick={save} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
          </button>
        )}
        {saveMsg && <span className="text-xs text-gray-500 ml-2">{saveMsg}</span>}
      </div>

      {placingId && (
        <div className="rounded-md border border-brand-200 bg-brand-50 p-2 text-xs text-brand-900 flex items-center gap-2">
          <span>Click on the map to place this asset.</span>
          <button className="btn-ghost text-xs" onClick={() => setPlacingId(null)}>Cancel</button>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-hidden">
          <div
            className="map-canvas relative w-full"
            style={{ height: "70vh", background: "#f9fafb" }}
          >
            <div
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: "0 0",
                transition: "transform 60ms linear",
              }}
              className="absolute inset-0"
            >
              <svg
                ref={svgRef}
                viewBox={viewBox}
                width="100%"
                height="100%"
                onClick={onSvgClick}
                onPointerDown={onSvgPointerDown}
              >
                {/* grid */}
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width={props.planWidth} height={props.planHeight} fill="url(#grid)" />

                {/* rooms */}
                {rooms.map((r) => (
                  <RoomShape
                    key={r.id}
                    room={r}
                    selected={selectedRoomId === r.id}
                    onClick={() => selectRoom(r.id)}
                    isAdmin={props.isAdmin}
                    onDelete={() => removeRoom(r.id)}
                    onEdit={(patch) => updateRoom(r.id, patch)}
                  />
                ))}

                {/* walls / doors / windows */}
                {mapObjects.map((o) => (
                  <MapObjectShape
                    key={o.id}
                    obj={o}
                    onRemove={props.isAdmin ? () => removeObject(o.id) : undefined}
                  />
                ))}

                {/* draft polygon while drawing */}
                {draftPoints.length > 0 && (
                  <g>
                    <polyline
                      points={draftPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="rgba(59,130,246,0.15)"
                      stroke="#2563eb"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                    {draftPoints.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r={4} fill="#2563eb" />
                    ))}
                  </g>
                )}

                {/* asset markers */}
                {assets.map((a) => (
                  <g
                    key={a.id}
                    transform={`translate(${a.x},${a.y})`}
                    style={{ cursor: props.isAdmin ? "grab" : "pointer" }}
                    onPointerDown={(e) => onAssetPointerDown(e, a.id)}
                  >
                    <circle
                      r={10}
                      fill={statusColor(a.status)}
                      stroke={selectedAssetId === a.id ? "#111827" : "white"}
                      strokeWidth={selectedAssetId === a.id ? 3 : 2}
                    />
                    <title>{a.label}</title>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="card p-4 space-y-4">
          {selectedRoomId && (
            <RoomInspector
              room={rooms.find((r) => r.id === selectedRoomId)!}
              isAdmin={props.isAdmin}
              onChange={(patch) => updateRoom(selectedRoomId, patch)}
              onDelete={() => removeRoom(selectedRoomId)}
            />
          )}
          {selectedAssetId && (() => {
            const a = assets.find((x) => x.id === selectedAssetId);
            if (!a) return null;
            return (
              <div>
                <div className="text-xs text-gray-500">Asset</div>
                <div className="font-semibold text-gray-900">{a.label}</div>
                <div className="text-xs text-gray-500 mt-1">Status: {a.status}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Position: {Math.round(a.x)}, {Math.round(a.y)}
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <Link href={`/assets/${a.publicId}`} className="btn-primary text-xs">
                    View details
                  </Link>
                  <Link href={`/assets/${a.publicId}/edit`} className="btn-secondary text-xs">
                    Edit
                  </Link>
                </div>
                {props.isAdmin && (
                  <p className="mt-3 text-[11px] text-gray-500">
                    Drag the marker to reposition. Save changes to persist.
                  </p>
                )}
              </div>
            );
          })()}
          {!selectedRoomId && !selectedAssetId && (
            <>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Rooms ({rooms.length})
                </div>
                <ul className="max-h-64 overflow-auto divide-y divide-gray-100">
                  {rooms.length === 0 && (
                    <li className="py-2 text-sm text-gray-500">
                      {props.isAdmin ? "Draw a room with the Room tool." : "No rooms yet."}
                    </li>
                  )}
                  {rooms.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => selectRoom(r.id)}
                        className="w-full text-left py-2 flex items-center justify-between text-sm hover:bg-gray-50 px-1 rounded"
                      >
                        <span>
                          <span className="font-medium">{r.name}</span>
                          <span className="ml-2 text-xs text-gray-500">{r.code}</span>
                        </span>
                        <span className="text-xs text-gray-500">{ROOM_TYPE_LABEL[r.type as never] ?? r.type}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Placed ({assets.length})
                </div>
                <ul className="max-h-40 overflow-auto divide-y divide-gray-100">
                  {assets.length === 0 && (
                    <li className="py-2 text-sm text-gray-500">No assets placed yet.</li>
                  )}
                  {assets.slice(0, 40).map((a) => (
                    <li key={a.id}>
                      <button
                        onClick={() => selectAsset(a.id)}
                        className="w-full text-left py-2 text-sm hover:bg-gray-50 px-1 rounded flex items-center gap-2"
                      >
                        <MapPin className="h-3 w-3" style={{ color: statusColor(a.status) }} />
                        <span className="truncate">{a.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              {props.isAdmin && (
                <UnplacedList
                  unplaced={unplaced}
                  roomsById={roomsById}
                  placingId={placingId}
                  onPickPlace={(id) => setPlacingId((cur) => (cur === id ? null : id))}
                  onPlaceCentre={(id) => placeAsset(id, props.planWidth / 2, props.planHeight / 2)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {showRoomModal && (
        <RoomCreateDialog
          onCancel={() => setShowRoomModal(false)}
          onCreate={(info) => {
            commitRoom(info);
            setShowRoomModal(false);
          }}
        />
      )}
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className={`btn ${active ? "bg-brand-600 text-white hover:bg-brand-700" : "bg-white border border-gray-300 hover:bg-gray-50"} px-2.5 py-1.5`}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  );
}

function RoomShape({
  room,
  selected,
  onClick,
  isAdmin,
  onDelete,
  onEdit,
}: {
  room: LocalRoom;
  selected: boolean;
  onClick: () => void;
  isAdmin: boolean;
  onDelete: () => void;
  onEdit: (patch: Partial<LocalRoom>) => void;
}) {
  const c = useMemo(
    () => (room.labelX && room.labelY ? { x: room.labelX, y: room.labelY } : polygonCentroid(room.points)),
    [room.labelX, room.labelY, room.points]
  );
  return (
    <g style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <polygon
        points={room.points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill={selected ? "rgba(37,99,235,0.15)" : "rgba(148,163,184,0.1)"}
        stroke={selected ? "#1d4ed8" : "#94a3b8"}
        strokeWidth={selected ? 3 : 1.5}
      />
      <text x={c.x} y={c.y} textAnchor="middle" fontSize={14} fill="#111827" pointerEvents="none">
        {room.name}
      </text>
      <text x={c.x} y={c.y + 16} textAnchor="middle" fontSize={11} fill="#6b7280" pointerEvents="none">
        {room.code}
      </text>
    </g>
  );
}

function MapObjectShape({ obj, onRemove }: { obj: { id: string; kind: string; data: Record<string, unknown> }; onRemove?: () => void }) {
  if (obj.kind === "WALL") {
    const { a, b, thickness } = obj.data as { a: Point; b: Point; thickness?: number };
    return (
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke="#111827"
        strokeWidth={thickness ?? 6}
        strokeLinecap="round"
        onDoubleClick={onRemove}
      />
    );
  }
  return null;
}

function RoomInspector({
  room,
  isAdmin,
  onChange,
  onDelete,
}: {
  room: LocalRoom;
  isAdmin: boolean;
  onChange: (patch: Partial<LocalRoom>) => void;
  onDelete: () => void;
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-2">Room</div>
      <label className="block text-xs font-medium text-gray-600">Name</label>
      <input
        disabled={!isAdmin}
        className="input mb-2"
        value={room.name}
        onChange={(e) => onChange({ name: e.target.value })}
      />
      <label className="block text-xs font-medium text-gray-600">Code</label>
      <input
        disabled={!isAdmin}
        className="input mb-2"
        value={room.code}
        onChange={(e) => onChange({ code: e.target.value })}
      />
      <label className="block text-xs font-medium text-gray-600">Type</label>
      <select
        disabled={!isAdmin}
        className="input"
        value={room.type}
        onChange={(e) => onChange({ type: e.target.value })}
      >
        {ROOM_TYPES.map((t) => (
          <option key={t} value={t}>{ROOM_TYPE_LABEL[t]}</option>
        ))}
      </select>
      {isAdmin && (
        <button className="btn-danger mt-3 w-full" onClick={onDelete}>
          <Trash2 className="h-4 w-4" /> Delete room
        </button>
      )}
    </div>
  );
}

function RoomCreateDialog({
  onCreate,
  onCancel,
}: {
  onCreate: (info: { name: string; code: string; type: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("New Room");
  const [code, setCode] = useState("R-001");
  const [type, setType] = useState<string>("ROOM");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30" role="dialog" aria-modal>
      <div className="card p-5 w-full max-w-md">
        <h3 className="text-base font-semibold mb-3">Name your room</h3>
        <label className="block text-xs font-medium text-gray-600">Name</label>
        <input className="input mb-2" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="block text-xs font-medium text-gray-600">Code</label>
        <input className="input mb-2" value={code} onChange={(e) => setCode(e.target.value)} />
        <label className="block text-xs font-medium text-gray-600">Type</label>
        <select className="input mb-4" value={type} onChange={(e) => setType(e.target.value)}>
          {ROOM_TYPES.map((t) => <option key={t} value={t}>{ROOM_TYPE_LABEL[t]}</option>)}
        </select>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={() => onCreate({ name, code, type })}>Create</button>
        </div>
      </div>
    </div>
  );
}

function UnplacedList({
  unplaced,
  roomsById,
  placingId,
  onPickPlace,
  onPlaceCentre,
}: {
  unplaced: UnplacedAsset[];
  roomsById: Record<string, { name: string; code: string }>;
  placingId: string | null;
  onPickPlace: (id: string) => void;
  onPlaceCentre: (id: string) => void;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
        Unplaced ({unplaced.length})
      </div>
      {unplaced.length === 0 ? (
        <p className="text-xs text-gray-500 py-1">
          All assets in this floor's rooms are placed on the map.
        </p>
      ) : (
        <ul className="max-h-56 overflow-auto divide-y divide-gray-100">
          {unplaced.slice(0, 60).map((a) => {
            const room = a.roomId ? roomsById[a.roomId] : undefined;
            const isPlacing = placingId === a.id;
            return (
              <li key={a.id} className="py-2 px-1 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate">{a.label}</div>
                    <div className="text-[11px] text-gray-500">
                      {room ? `${room.name} (${room.code})` : "no room"}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      className={`btn text-xs px-2 py-1 ${
                        isPlacing
                          ? "bg-brand-600 text-white hover:bg-brand-700"
                          : "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                      }`}
                      onClick={() => onPickPlace(a.id)}
                      title="Click on the map to place"
                    >
                      {isPlacing ? "Cancel" : "Place"}
                    </button>
                    <button
                      className="btn border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs px-2 py-1"
                      onClick={() => onPlaceCentre(a.id)}
                      title="Place at map centre"
                    >
                      ▣
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {unplaced.length > 60 && (
        <p className="text-[11px] text-gray-500 mt-1">
          Showing first 60. Assign more via the bulk-assign tool on /assets.
        </p>
      )}
    </div>
  );
}

function statusColor(status: string) {
  switch (status) {
    case "ACTIVE": return "#22c55e";
    case "INACTIVE": return "#64748b";
    case "CONDEMNED": return "#dc2626";
    case "WIP": return "#f59e0b";
    case "LOST": return "#7c3aed";
    case "UNDER_REPAIR": return "#0891b2";
    default: return "#ef4444";
  }
}

function safeGeom(json: string): Point[] {
  try {
    const g = JSON.parse(json);
    if (Array.isArray(g?.points)) return g.points;
  } catch { /* noop */ }
  return [];
}
function safeJson(json: string): Record<string, unknown> {
  try { return JSON.parse(json); } catch { return {}; }
}
