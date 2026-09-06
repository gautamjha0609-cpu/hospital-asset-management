import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { assetUrl } from "@/lib/env";
import { displayName } from "@/lib/asset";
import {
  MapPin,
  Edit,
  QrCode,
  FileDown,
  History,
  Package,
} from "lucide-react";
import { AssetFilesPanel } from "@/components/AssetFilesPanel";
import { ExpectedRoomsEditor } from "@/components/ExpectedRoomsEditor";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  const asset = await prisma.asset.findFirst({
    where: { OR: [{ publicId: id }, { id }] },
    include: {
      majorCategory: true,
      finalCategory: true,
      subCategory: true,
      department: true,
      vendor: true,
      costCenter: true,
      room: { include: { floor: { include: { building: true } } } },
      floor: { include: { building: true } },
      images: true,
      documents: true,
      locationHistory: {
        orderBy: { movedAt: "desc" },
        take: 100,
        include: {
          room: { include: { floor: { include: { building: true } } } },
          movedBy: { select: { id: true, email: true, name: true } },
        },
      },
      statusHistory: { orderBy: { changedAt: "desc" }, take: 100 },
      customFieldValues: { include: { field: true } },
      purchaseLine: true,
      depreciations: { orderBy: { fiscalYear: "asc" } },
      importMeta: true,
    },
  });
  if (!asset) notFound();

  // Sibling line items — assets purchased on the same PO Identical-Line
  // Group, or (when no PO data exists) matching vendor + cost + name.
  const poGroupId = asset.purchaseLine?.poIdenticalLineGroup;
  const poNumber = asset.purchaseLine?.poNumber;
  let siblings: {
    id: string;
    publicId: string;
    name: string | null;
    description: string;
    tagCode: string | null;
    status: string;
    room: { id: string; name: string; code: string } | null;
  }[] = [];
  if (poGroupId != null && poNumber) {
    siblings = await prisma.asset.findMany({
      where: {
        id: { not: asset.id },
        purchaseLine: { poIdenticalLineGroup: poGroupId, poNumber },
      },
      select: {
        id: true, publicId: true, name: true, description: true,
        tagCode: true, status: true,
        room: { select: { id: true, name: true, code: true } },
      },
      take: 200,
    });
  } else if (asset.vendorId && asset.costGrossBlock > 0) {
    siblings = await prisma.asset.findMany({
      where: {
        id: { not: asset.id },
        vendorId: asset.vendorId,
        costGrossBlock: asset.costGrossBlock,
        OR: [
          { name: asset.name },
          { description: asset.description },
        ],
      },
      select: {
        id: true, publicId: true, name: true, description: true,
        tagCode: true, status: true,
        room: { select: { id: true, name: true, code: true } },
      },
      take: 200,
    });
  }

  // Expected rooms — only load room lookup for movable assets, and only
  // when the asset has any ids stored.
  let expectedRoomsData: {
    ids: string[];
    byId: Record<string, { id: string; name: string; code: string; floorName?: string; buildingName?: string }>;
    all: { id: string; name: string; code: string; floorName?: string; buildingName?: string }[];
  } = { ids: [], byId: {}, all: [] };
  if (asset.assetType === "MOVABLE") {
    let ids: string[] = [];
    try {
      ids = asset.expectedRoomIds ? JSON.parse(asset.expectedRoomIds) : [];
      if (!Array.isArray(ids)) ids = [];
    } catch {
      ids = [];
    }
    const roomsList = await prisma.room.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, code: true,
        floor: { select: { name: true, building: { select: { name: true } } } },
      },
    });
    const flat = roomsList.map((r) => ({
      id: r.id, name: r.name, code: r.code,
      floorName: r.floor.name,
      buildingName: r.floor.building.name,
    }));
    const byId = Object.fromEntries(flat.map((r) => [r.id, r]));
    expectedRoomsData = { ids, byId, all: flat };
  }

  return (
    <div className="space-y-6">
      <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
        <Link href="/assets" className="hover:underline">Assets</Link>
        <span>/</span>
        <span className="text-gray-700">{asset.tagCode ?? asset.description.slice(0, 60)}</span>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-gray-500 flex gap-2 items-center">
            <span className="font-mono">{asset.publicId}</span>
            {asset.tagCode && <span className="tag">Tag {asset.tagCode}</span>}
          </div>
          <h1 className="text-2xl font-semibold">{displayName(asset)}</h1>
          {asset.name && asset.name !== asset.description && (
            <p className="text-sm text-gray-600 max-w-3xl mt-1">{asset.description}</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {asset.roomId && (
            <Link href={`/floors/${asset.floorId}`} className="btn-secondary">
              <MapPin className="h-4 w-4" /> View on map
            </Link>
          )}
          <a href={`/api/assets/${asset.publicId}/qr`} className="btn-secondary" target="_blank" rel="noopener">
            <QrCode className="h-4 w-4" /> QR code
          </a>
          <a href={`/api/assets/export?onlyId=${asset.id}`} className="btn-secondary">
            <FileDown className="h-4 w-4" /> Open in Excel
          </a>
          {user?.role === "ADMIN" && (
            <Link href={`/assets/${asset.publicId}/edit`} className="btn-primary">
              <Edit className="h-4 w-4" /> Edit
            </Link>
          )}
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2 space-y-4">
          <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Package className="h-4 w-4" /> Basic information
          </h2>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Field label="Asset type" value={asset.assetType} />
            <Field label="Status" value={asset.status} />
            <Field label="Condition" value={asset.condition ?? "—"} />
            <Field label="Major category" value={asset.majorCategory?.name ?? "—"} />
            <Field label="Final category" value={asset.finalCategory?.name ?? "—"} />
            <Field label="Sub category" value={asset.subCategory?.name ?? "—"} />
            <Field label="Department" value={asset.department?.name ?? "—"} />
            <Field label="Vendor" value={asset.vendor?.name ?? "—"} />
            <Field label="Cost center" value={asset.costCenter?.code ?? "—"} />
            <Field label="Plant" value={asset.plantCode ?? "—"} />
            <Field label="Asset class" value={asset.assetClass ?? "—"} />
            <Field label="Tangibility" value={asset.tangibility ?? "—"} />
            <Field label="Depreciation key" value={asset.depreciationKey ?? "—"} />
            <Field label="GL code" value={asset.glCode?.toString() ?? "—"} />
            <Field label="Serial number" value={asset.serialNumber ?? "—"} />
            <Field label="Model" value={asset.modelNumber ?? "—"} />
            <Field label="Manufacturer" value={asset.manufacturer ?? "—"} />
            <Field label="Barcode" value={asset.barcode ?? "—"} />
          </dl>
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Current location
          </h2>
          {asset.room ? (
            <div className="text-sm space-y-1">
              <div>
                <span className="text-gray-500">Building</span>{" "}
                <Link href={`/buildings/${asset.room.floor.building.id}`} className="text-brand-700 hover:underline">
                  {asset.room.floor.building.name}
                </Link>
              </div>
              <div>
                <span className="text-gray-500">Floor</span>{" "}
                <Link href={`/floors/${asset.room.floor.id}`} className="text-brand-700 hover:underline">
                  {asset.room.floor.name}
                </Link>
              </div>
              <div>
                <span className="text-gray-500">Room</span>{" "}
                <Link href={`/rooms/${asset.room.id}`} className="text-brand-700 hover:underline">
                  {asset.room.name} ({asset.room.code})
                </Link>
              </div>
              {asset.mapX != null && asset.mapY != null && (
                <div className="text-xs text-gray-500 mt-2">
                  Map position: {Math.round(asset.mapX)}, {Math.round(asset.mapY)}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Not assigned to a room yet.</p>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Procurement</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Voucher date" value={formatDate(asset.voucherDate)} />
            <Field label="Voucher #" value={asset.voucherNumber ?? "—"} />
            <Field label="Capitalized" value={asset.capitalized ? "Yes" : "No"} />
            <Field label="Cap. date" value={formatDate(asset.effectiveCapitalizationDate)} />
            <Field label="Cost (gross)" value={formatCurrency(asset.costGrossBlock)} />
            <Field label="Net block" value={formatCurrency(asset.netBlock)} />
            <Field label="Warranty expiry" value={formatDate(asset.warrantyExpiry)} />
          </dl>
        </div>

        {asset.purchaseLine && (
          <div className="card p-5 lg:col-span-2">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Purchase order</h2>
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Field label="PO #" value={asset.purchaseLine.poNumber ?? "—"} />
              <Field label="PO date" value={formatDate(asset.purchaseLine.poDate)} />
              <Field label="FY" value={asset.purchaseLine.poFinancialYear ?? "—"} />
              <Field label="Vendor code" value={asset.purchaseLine.poVendorCode ?? "—"} />
              <Field label="Vendor name" value={asset.purchaseLine.poVendorName ?? "—"} />
              <Field label="Document type" value={asset.purchaseLine.poDocumentType ?? "—"} />
              <Field label="HSN" value={asset.purchaseLine.poHsn?.toString() ?? "—"} />
              <Field label="Qty" value={asset.purchaseLine.poQty?.toString() ?? "—"} />
              <Field label="Unit" value={asset.purchaseLine.poUnit ?? "—"} />
              <Field label="Base rate" value={formatCurrency(asset.purchaseLine.poBaseRate)} />
              <Field label="CGST" value={formatCurrency(asset.purchaseLine.poCgstAmt)} />
              <Field label="SGST" value={formatCurrency(asset.purchaseLine.poSgstAmt)} />
              <Field label="IGST" value={formatCurrency(asset.purchaseLine.poIgstAmt)} />
              <Field label="Total" value={formatCurrency(asset.purchaseLine.poTotalAmount)} />
              <Field label="Match confidence" value={asset.purchaseLine.poMatchConfidence ?? "—"} />
            </dl>
          </div>
        )}
      </section>

      {asset.depreciations.length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Depreciation by fiscal year</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>FY</th>
                  <th>Cap. date</th>
                  <th>Days</th>
                  <th>Depreciation</th>
                  <th>Accum. to FY end</th>
                </tr>
              </thead>
              <tbody>
                {asset.depreciations.map((d) => (
                  <tr key={d.id}>
                    <td>{d.fiscalYear}</td>
                    <td>{formatDate(d.capDate)}</td>
                    <td>{d.daysDep ?? "—"}</td>
                    <td>{formatCurrency(d.depAmount)}</td>
                    <td>{formatCurrency(d.accumUpto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <History className="h-4 w-4" /> Location history
          </h2>
          {asset.locationHistory.length === 0 ? (
            <p className="text-sm text-gray-500">No movement recorded.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {asset.locationHistory.map((h) => (
                <li key={h.id} className="border-l-2 border-brand-200 pl-3">
                  <div className="text-xs text-gray-500">{formatDate(h.movedAt)}</div>
                  <div>
                    {h.room ? (
                      <>
                        {h.room.floor.building.name} → {h.room.floor.name} → {h.room.name}
                      </>
                    ) : (
                      "Unassigned"
                    )}
                  </div>
                  {h.reason && <div className="text-xs text-gray-500 italic">"{h.reason}"</div>}
                  {h.movedBy && (
                    <div className="text-[11px] text-gray-400">by {h.movedBy.name ?? h.movedBy.email}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Status history</h2>
          {asset.statusHistory.length === 0 ? (
            <p className="text-sm text-gray-500">No status changes recorded.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {asset.statusHistory.map((h) => (
                <li key={h.id}>
                  <span className="text-xs text-gray-500">{formatDate(h.changedAt)}</span>
                  <span className="ml-2">{h.oldStatus ?? "—"} → {h.newStatus}</span>
                  {h.reason && <span className="text-xs text-gray-500 italic ml-2">"{h.reason}"</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {asset.assetType === "MOVABLE" && (
        <section className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Likely to be found in
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            This is a movable asset. Add rooms it usually rotates between so
            staff know where to check.
          </p>
          <ExpectedRoomsEditor
            assetPublicId={asset.publicId}
            initialRoomIds={expectedRoomsData.ids}
            roomsById={expectedRoomsData.byId}
            allRooms={expectedRoomsData.all}
            canEdit={user?.role === "ADMIN"}
          />
        </section>
      )}

      {siblings.length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" /> Part of a group of {siblings.length + 1} identical units
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            {poNumber
              ? <>Purchased on the same PO line (<span className="font-mono">{poNumber}</span>). Each unit is its own asset with its own URL and can be located and verified independently.</>
              : "These assets share the same vendor, price, and description — likely the same purchase in bulk."}
          </p>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Room</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {siblings.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs">{s.tagCode ?? s.publicId.slice(0, 8)}</td>
                    <td className="text-xs">
                      {s.room ? (
                        <Link href={`/rooms/${s.room.id}`} className="text-brand-700 hover:underline">
                          {s.room.name} ({s.room.code})
                        </Link>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="text-xs">{s.status}</td>
                    <td className="text-right">
                      <Link href={`/assets/${s.publicId}`} className="text-xs text-brand-700 hover:underline">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <AssetFilesPanel
        assetPublicId={asset.publicId}
        files={{ images: asset.images, documents: asset.documents }}
        canEdit={user?.role === "ADMIN"}
      />

      {asset.customFieldValues.length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Custom fields</h2>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {asset.customFieldValues.map((v) => (
              <Field key={v.id} label={v.field.label} value={v.value} />
            ))}
          </dl>
        </section>
      )}

      {asset.importMeta && (
        <section className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Import metadata
            <span className="ml-2 text-xs text-gray-400 font-normal">
              (preserved from source workbook for audit)
            </span>
          </h2>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Field label="Asset class source" value={asset.importMeta.assetClassSource ?? "—"} />
            <Field label="Outsource status" value={asset.importMeta.outsourceStatus ?? "—"} />
            <Field label="Outsource remarks" value={asset.importMeta.outsourceRemarks ?? "—"} />
            <Field label="RBH resolution" value={asset.importMeta.rbhResolution ?? "—"} />
            <Field label="RBH confidence" value={asset.importMeta.rbhConfidence ?? "—"} />
            <Field label="RBH note" value={asset.importMeta.rbhNote ?? "—"} />
          </dl>
        </section>
      )}

      <section className="text-xs text-gray-400">
        Public URL:{" "}
        <code className="text-gray-500">{assetUrl(asset.publicId)}</code>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 break-words">{value}</dd>
    </div>
  );
}
