"use client";
import { create } from "zustand";
import { temporal } from "zundo";

// Shared editor state for one floor. Only admins can mutate — user role
// simply doesn't get the editor toolbar.

export type Point = { x: number; y: number };
export type EditorMode =
  | "SELECT"
  | "DRAW_ROOM"
  | "DRAW_WALL"
  | "PLACE_DOOR"
  | "PLACE_WINDOW"
  | "PLACE_LABEL"
  | "PLACE_ASSET";

export type LocalRoom = {
  id: string;          // may be a temp id like "tmp-xxx" until saved
  name: string;
  code: string;
  type: string;
  points: Point[];
  labelX?: number | null;
  labelY?: number | null;
  dirty?: boolean;
  isNew?: boolean;
};

export type LocalMapObject = {
  id: string;
  kind: "WALL" | "DOOR" | "WINDOW" | "LABEL" | "LINE";
  data: Record<string, unknown>;
  dirty?: boolean;
  isNew?: boolean;
};

export type LocalAssetMarker = {
  id: string;
  publicId: string;
  label: string;
  status: string;
  x: number;
  y: number;
};

interface MapState {
  floorId: string;
  planWidth: number;
  planHeight: number;
  mode: EditorMode;
  zoom: number;
  panX: number;
  panY: number;
  selectedRoomId: string | null;
  selectedAssetId: string | null;

  rooms: LocalRoom[];
  mapObjects: LocalMapObject[];
  assets: LocalAssetMarker[];

  draftPoints: Point[];

  // actions
  setMode: (m: EditorMode) => void;
  setZoom: (z: number) => void;
  pan: (dx: number, dy: number) => void;
  resetView: () => void;
  addDraftPoint: (p: Point) => void;
  cancelDraft: () => void;
  commitRoom: (info: { name: string; code: string; type: string }) => void;
  updateRoom: (id: string, patch: Partial<LocalRoom>) => void;
  removeRoom: (id: string) => void;
  selectRoom: (id: string | null) => void;
  selectAsset: (id: string | null) => void;
  moveAsset: (id: string, x: number, y: number) => void;
  addWall: (a: Point, b: Point) => void;
  removeObject: (id: string) => void;
  hydrate: (payload: {
    floorId: string;
    planWidth: number;
    planHeight: number;
    rooms: LocalRoom[];
    mapObjects: LocalMapObject[];
    assets: LocalAssetMarker[];
  }) => void;
}

function tmpId(prefix = "tmp") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useMapStore = create<MapState>()(
  temporal<MapState>((set) => ({
    floorId: "",
    planWidth: 2000,
    planHeight: 1400,
    mode: "SELECT",
    zoom: 1,
    panX: 0,
    panY: 0,
    selectedRoomId: null,
    selectedAssetId: null,
    rooms: [],
    mapObjects: [],
    assets: [],
    draftPoints: [],

    setMode: (m) => set({ mode: m, draftPoints: [] }),
    setZoom: (z) => set({ zoom: Math.max(0.2, Math.min(4, z)) }),
    pan: (dx, dy) => set((s) => ({ panX: s.panX + dx, panY: s.panY + dy })),
    resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),

    addDraftPoint: (p) =>
      set((s) => ({ draftPoints: [...s.draftPoints, p] })),

    cancelDraft: () => set({ draftPoints: [] }),

    commitRoom: (info) =>
      set((s) => {
        if (s.draftPoints.length < 3) return s;
        const room: LocalRoom = {
          id: tmpId("room"),
          name: info.name,
          code: info.code,
          type: info.type,
          points: s.draftPoints,
          dirty: true,
          isNew: true,
        };
        return { rooms: [...s.rooms, room], draftPoints: [], mode: "SELECT" };
      }),

    updateRoom: (id, patch) =>
      set((s) => ({
        rooms: s.rooms.map((r) => (r.id === id ? { ...r, ...patch, dirty: true } : r)),
      })),

    removeRoom: (id) =>
      set((s) => ({ rooms: s.rooms.filter((r) => r.id !== id), selectedRoomId: null })),

    selectRoom: (id) => set({ selectedRoomId: id, selectedAssetId: null }),
    selectAsset: (id) => set({ selectedAssetId: id, selectedRoomId: null }),

    moveAsset: (id, x, y) =>
      set((s) => ({
        assets: s.assets.map((a) => (a.id === id ? { ...a, x, y } : a)),
      })),

    addWall: (a, b) =>
      set((s) => ({
        mapObjects: [
          ...s.mapObjects,
          {
            id: tmpId("wall"),
            kind: "WALL",
            data: { a, b, thickness: 6 },
            dirty: true,
            isNew: true,
          },
        ],
      })),

    removeObject: (id) =>
      set((s) => ({ mapObjects: s.mapObjects.filter((o) => o.id !== id) })),

    hydrate: (payload) => set(payload),
  }), { limit: 100 })
);

export const useMapUndo = () => useMapStore.temporal;
