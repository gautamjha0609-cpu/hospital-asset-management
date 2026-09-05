"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ASSET_STATUSES, ASSET_TYPES, ASSET_CONDITIONS } from "@/lib/asset";

type Named = { id: string; name: string };
type CostCenter = { id: string; code: string; name: string | null };
type Building = {
  id: string;
  name: string;
  floors: {
    id: string;
    name: string;
    rooms: { id: string; name: string; code: string }[];
  }[];
};

type Options = {
  majors: Named[];
  finals: Named[];
  subs: Named[];
  vendors: Named[];
  departments: Named[];
  costCenters: CostCenter[];
  buildings: Building[];
};

type AssetLike = {
  id: string;
  publicId: string;
  description: string;
  tagCode: string | null;
  assetType: string;
  status: string;
  condition: string | null;
  assetClass: string | null;
  tangibility: string | null;
  capitalized: boolean;
  costGrossBlock: number;
  voucherDate: Date | string | null;
  voucherNumber: string | null;
  effectiveCapitalizationDate: Date | string | null;
  serialNumber: string | null;
  modelNumber: string | null;
  manufacturer: string | null;
  barcode: string | null;
  warrantyExpiry: Date | string | null;
  majorCategoryId: string | null;
  finalCategoryId: string | null;
  subCategoryId: string | null;
  vendorId: string | null;
  departmentId: string | null;
  costCenterId: string | null;
  plantCode: string | null;
  floorId: string | null;
  roomId: string | null;
};

function d(v: Date | string | null | undefined) {
  if (!v) return "";
  const date = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function AssetForm(props: {
  mode: "create" | "edit";
  asset?: AssetLike;
  options: Options;
}) {
  const router = useRouter();
  const { asset, options } = props;
  const [state, setState] = useState({
    description: asset?.description ?? "",
    tagCode: asset?.tagCode ?? "",
    assetType: asset?.assetType ?? "MOVABLE",
    status: asset?.status ?? "ACTIVE",
    condition: asset?.condition ?? "",
    assetClass: asset?.assetClass ?? "",
    tangibility: asset?.tangibility ?? "TANGIBLE",
    capitalized: asset?.capitalized ?? true,
    costGrossBlock: asset?.costGrossBlock ?? 0,
    voucherDate: d(asset?.voucherDate),
    voucherNumber: asset?.voucherNumber ?? "",
    effectiveCapitalizationDate: d(asset?.effectiveCapitalizationDate),
    serialNumber: asset?.serialNumber ?? "",
    modelNumber: asset?.modelNumber ?? "",
    manufacturer: asset?.manufacturer ?? "",
    barcode: asset?.barcode ?? "",
    warrantyExpiry: d(asset?.warrantyExpiry),
    majorCategoryId: asset?.majorCategoryId ?? "",
    finalCategoryId: asset?.finalCategoryId ?? "",
    subCategoryId: asset?.subCategoryId ?? "",
    vendorId: asset?.vendorId ?? "",
    departmentId: asset?.departmentId ?? "",
    costCenterId: asset?.costCenterId ?? "",
    plantCode: asset?.plantCode ?? "",
    floorId: asset?.floorId ?? "",
    roomId: asset?.roomId ?? "",
    buildingId: "",
    moveReason: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive building from selected floor if editing.
  const buildingId = useMemo(() => {
    if (state.buildingId) return state.buildingId;
    if (!state.floorId) return "";
    for (const b of options.buildings) {
      if (b.floors.find((f) => f.id === state.floorId)) return b.id;
    }
    return "";
  }, [state.buildingId, state.floorId, options.buildings]);

  const floors = options.buildings.find((b) => b.id === buildingId)?.floors ?? [];
  const rooms = floors.find((f) => f.id === state.floorId)?.rooms ?? [];

  function setField<K extends keyof typeof state>(key: K, value: (typeof state)[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const body: Record<string, unknown> = {
      description: state.description,
      tagCode: state.tagCode || null,
      assetType: state.assetType,
      status: state.status,
      condition: state.condition || null,
      assetClass: state.assetClass || null,
      tangibility: state.tangibility || null,
      capitalized: !!state.capitalized,
      costGrossBlock: Number(state.costGrossBlock) || 0,
      voucherDate: state.voucherDate ? new Date(state.voucherDate).toISOString() : null,
      voucherNumber: state.voucherNumber || null,
      effectiveCapitalizationDate: state.effectiveCapitalizationDate
        ? new Date(state.effectiveCapitalizationDate).toISOString()
        : null,
      serialNumber: state.serialNumber || null,
      modelNumber: state.modelNumber || null,
      manufacturer: state.manufacturer || null,
      barcode: state.barcode || null,
      warrantyExpiry: state.warrantyExpiry ? new Date(state.warrantyExpiry).toISOString() : null,
      majorCategoryId: state.majorCategoryId || null,
      finalCategoryId: state.finalCategoryId || null,
      subCategoryId: state.subCategoryId || null,
      vendorId: state.vendorId || null,
      departmentId: state.departmentId || null,
      costCenterId: state.costCenterId || null,
      plantCode: state.plantCode || null,
      floorId: state.floorId || null,
      roomId: state.roomId || null,
      buildingId: buildingId || null,
      moveReason: state.moveReason || null,
    };
    const url = props.mode === "create" ? "/api/assets" : `/api/assets/${asset!.id}`;
    const method = props.mode === "create" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Save failed.");
      return;
    }
    const j = await res.json();
    const pub = j.asset?.publicId ?? asset?.publicId;
    if (pub) router.push(`/assets/${pub}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-6">
      <fieldset className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <Label>Description</Label>
          <input required className="input" value={state.description} onChange={(e) => setField("description", e.target.value)} />
        </div>
        <div>
          <Label>Tag code (FAR No.)</Label>
          <input className="input" value={state.tagCode ?? ""} onChange={(e) => setField("tagCode", e.target.value)} />
        </div>
        <div>
          <Label>Asset type</Label>
          <select className="input" value={state.assetType} onChange={(e) => setField("assetType", e.target.value)}>
            {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <Label>Status</Label>
          <select className="input" value={state.status} onChange={(e) => setField("status", e.target.value)}>
            {ASSET_STATUSES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <Label>Condition</Label>
          <select className="input" value={state.condition ?? ""} onChange={(e) => setField("condition", e.target.value)}>
            <option value="">—</option>
            {ASSET_CONDITIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </fieldset>

      <fieldset className="grid gap-3 md:grid-cols-3">
        <div>
          <Label>Major category</Label>
          <select className="input" value={state.majorCategoryId ?? ""} onChange={(e) => setField("majorCategoryId", e.target.value)}>
            <option value="">—</option>
            {options.majors.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Final category</Label>
          <select className="input" value={state.finalCategoryId ?? ""} onChange={(e) => setField("finalCategoryId", e.target.value)}>
            <option value="">—</option>
            {options.finals.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Sub category</Label>
          <select className="input" value={state.subCategoryId ?? ""} onChange={(e) => setField("subCategoryId", e.target.value)}>
            <option value="">—</option>
            {options.subs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Department</Label>
          <select className="input" value={state.departmentId ?? ""} onChange={(e) => setField("departmentId", e.target.value)}>
            <option value="">—</option>
            {options.departments.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Vendor</Label>
          <select className="input" value={state.vendorId ?? ""} onChange={(e) => setField("vendorId", e.target.value)}>
            <option value="">—</option>
            {options.vendors.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Cost center</Label>
          <select className="input" value={state.costCenterId ?? ""} onChange={(e) => setField("costCenterId", e.target.value)}>
            <option value="">—</option>
            {options.costCenters.map((o) => <option key={o.id} value={o.id}>{o.code} {o.name ?? ""}</option>)}
          </select>
        </div>
      </fieldset>

      <fieldset className="grid gap-3 md:grid-cols-3">
        <div>
          <Label>Cost (Gross Block)</Label>
          <input type="number" step="0.01" className="input" value={state.costGrossBlock} onChange={(e) => setField("costGrossBlock", Number(e.target.value))} />
        </div>
        <div>
          <Label>Voucher date</Label>
          <input type="date" className="input" value={state.voucherDate} onChange={(e) => setField("voucherDate", e.target.value)} />
        </div>
        <div>
          <Label>Voucher #</Label>
          <input className="input" value={state.voucherNumber ?? ""} onChange={(e) => setField("voucherNumber", e.target.value)} />
        </div>
        <div>
          <Label>Effective cap. date</Label>
          <input type="date" className="input" value={state.effectiveCapitalizationDate} onChange={(e) => setField("effectiveCapitalizationDate", e.target.value)} />
        </div>
        <div>
          <Label>Warranty expiry</Label>
          <input type="date" className="input" value={state.warrantyExpiry} onChange={(e) => setField("warrantyExpiry", e.target.value)} />
        </div>
        <div>
          <Label>Capitalized</Label>
          <select className="input" value={state.capitalized ? "1" : "0"} onChange={(e) => setField("capitalized", e.target.value === "1")}>
            <option value="1">Yes</option>
            <option value="0">No — WIP</option>
          </select>
        </div>
      </fieldset>

      <fieldset className="grid gap-3 md:grid-cols-3">
        <div>
          <Label>Serial number</Label>
          <input className="input" value={state.serialNumber ?? ""} onChange={(e) => setField("serialNumber", e.target.value)} />
        </div>
        <div>
          <Label>Model</Label>
          <input className="input" value={state.modelNumber ?? ""} onChange={(e) => setField("modelNumber", e.target.value)} />
        </div>
        <div>
          <Label>Manufacturer</Label>
          <input className="input" value={state.manufacturer ?? ""} onChange={(e) => setField("manufacturer", e.target.value)} />
        </div>
        <div>
          <Label>Barcode</Label>
          <input className="input" value={state.barcode ?? ""} onChange={(e) => setField("barcode", e.target.value)} />
        </div>
        <div>
          <Label>Asset class</Label>
          <input className="input" value={state.assetClass ?? ""} onChange={(e) => setField("assetClass", e.target.value)} />
        </div>
        <div>
          <Label>Plant</Label>
          <input className="input" value={state.plantCode ?? ""} onChange={(e) => setField("plantCode", e.target.value)} />
        </div>
      </fieldset>

      <fieldset className="grid gap-3 md:grid-cols-3">
        <div>
          <Label>Building</Label>
          <select
            className="input"
            value={buildingId}
            onChange={(e) => {
              setField("buildingId", e.target.value);
              setField("floorId", "");
              setField("roomId", "");
            }}
          >
            <option value="">—</option>
            {options.buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Floor</Label>
          <select
            className="input"
            value={state.floorId ?? ""}
            onChange={(e) => {
              setField("floorId", e.target.value);
              setField("roomId", "");
            }}
            disabled={!buildingId}
          >
            <option value="">—</option>
            {floors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Room</Label>
          <select
            className="input"
            value={state.roomId ?? ""}
            onChange={(e) => setField("roomId", e.target.value)}
            disabled={!state.floorId}
          >
            <option value="">—</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
          </select>
        </div>
        {props.mode === "edit" && (
          <div className="md:col-span-3">
            <Label>Move reason (recorded in location history)</Label>
            <input className="input" value={state.moveReason} onChange={(e) => setField("moveReason", e.target.value)} placeholder="e.g. Relocated to ICU-04 after refurbishment" />
          </div>
        )}
      </fieldset>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : props.mode === "create" ? "Create asset" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>;
}
