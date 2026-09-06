import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AssetFilters } from "@/components/AssetFilters";
import { GroupedAssetsClient } from "@/components/GroupedAssetsClient";
import type { Prisma } from "@prisma/client";
import { Download, List } from "lucide-react";

export const dynamic = "force-dynamic";

const GROUP_PAGE = 40; // groups per page

export default async function GroupedAssetsPage(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  const sp = await props.searchParams;
  const q = (sp.q ?? "").trim();

  const where: Prisma.AssetWhereInput = {};
  if (q) {
    where.OR = [
      { tagCode: { contains: q } },
      { name: { contains: q } },
      { description: { contains: q } },
      { serialNumber: { contains: q } },
      { barcode: { contains: q } },
    ];
  }
  if (sp.majorCategoryId) where.majorCategoryId = sp.majorCategoryId;
  if (sp.finalCategoryId) where.finalCategoryId = sp.finalCategoryId;
  if (sp.departmentId) where.departmentId = sp.departmentId;
  if (sp.buildingId || sp.floorId) {
    where.floor = { ...(sp.buildingId ? { buildingId: sp.buildingId } : {}), ...(sp.floorId ? { id: sp.floorId } : {}) };
  }
  if (sp.roomId) where.roomId = sp.roomId;
  if (sp.roomType) where.room = { type: sp.roomType };
  if (sp.assetType) where.assetType = sp.assetType;
  if (sp.status) where.status = sp.status;

  // Fetch all matching assets (capped) with the fields we need to group by.
  // For a real hospital deployment of ~19K assets this stays under a
  // second on Postgres; if it grows past 200K we'd move grouping into a
  // materialized view.
  const [rows, majors, finals, departments, buildingsFull] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: [{ voucherDate: "desc" }, { id: "asc" }],
      take: 20_000,
      select: {
        id: true,
        publicId: true,
        name: true,
        description: true,
        tagCode: true,
        status: true,
        costGrossBlock: true,
        voucherDate: true,
        vendor: { select: { id: true, name: true } },
        majorCategory: { select: { name: true } },
        finalCategory: { select: { name: true } },
        subCategory: { select: { name: true } },
        department: { select: { name: true } },
        room: { select: { id: true, name: true, code: true, floor: { select: { building: { select: { name: true } } } } } },
        purchaseLine: {
          select: {
            poIdenticalLineGroup: true,
            poNumber: true,
            poDate: true,
            poQty: true,
            poVendorName: true,
            poIgstRate: true,
            poCgstRate: true,
          },
        },
      },
    }),
    prisma.majorCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.finalCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.building.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        floors: {
          orderBy: { levelIndex: "asc" },
          select: {
            id: true,
            name: true,
            rooms: { orderBy: { name: "asc" }, select: { id: true, name: true, code: true } },
          },
        },
      },
    }),
  ]);

  // Group by:
  //   1. If the PO-line has an Identical-Line Group id → key = "po:<id>:<vendor>:<cost>"
  //   2. Otherwise fall back to a computed fingerprint of the identifying attributes.
  type Row = (typeof rows)[number];
  const groups = new Map<string, { key: string; label: string; rows: Row[]; poNumber?: string | null }>();
  for (const r of rows) {
    const poGroup = r.purchaseLine?.poIdenticalLineGroup;
    let key: string;
    if (poGroup != null && r.purchaseLine?.poNumber) {
      key = `po:${r.purchaseLine.poNumber}:${poGroup}`;
    } else {
      // Compute-on-the-fly fingerprint. Same-name/same-vendor/same-cost/same-major → same group.
      key = [
        "fp",
        r.vendor?.id ?? "-",
        r.majorCategory?.name ?? "-",
        r.subCategory?.name ?? "-",
        Math.round(r.costGrossBlock ?? 0),
        (r.name ?? r.description).trim().slice(0, 80).toLowerCase(),
      ].join("|");
    }
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: r.name ?? r.description.slice(0, 100),
        rows: [],
        poNumber: r.purchaseLine?.poNumber,
      });
    }
    groups.get(key)!.rows.push(r);
  }

  // Sort groups: largest first, then most recent voucher date
  const asArray = Array.from(groups.values()).sort((a, b) => {
    if (b.rows.length !== a.rows.length) return b.rows.length - a.rows.length;
    const aDate = a.rows[0].voucherDate ? +new Date(a.rows[0].voucherDate) : 0;
    const bDate = b.rows[0].voucherDate ? +new Date(b.rows[0].voucherDate) : 0;
    return bDate - aDate;
  });

  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const totalGroups = asArray.length;
  const totalPages = Math.max(1, Math.ceil(totalGroups / GROUP_PAGE));
  const pageGroups = asArray.slice((page - 1) * GROUP_PAGE, page * GROUP_PAGE);

  const qs = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => {
    if (v && k !== "page") qs.set(k, v);
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Assets — grouped view</h1>
          <p className="text-sm text-gray-500">
            {totalGroups.toLocaleString("en-IN")} groups · {rows.length.toLocaleString("en-IN")} line items
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/assets?${qs.toString()}`} className="btn-secondary">
            <List className="h-4 w-4" /> Line-item view
          </Link>
          <a href={`/api/assets/export?${qs.toString()}`} className="btn-secondary">
            <Download className="h-4 w-4" /> Export XLSX
          </a>
        </div>
      </header>

      <AssetFilters
        majors={majors}
        finals={finals}
        departments={departments}
        buildings={buildingsFull}
      />

      <GroupedAssetsClient groups={pageGroups} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div>Page {page} of {totalPages}</div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link className="btn-secondary" href={`/assets/grouped?${qs.toString()}&page=${page - 1}`}>Previous</Link>
            )}
            {page < totalPages && (
              <Link className="btn-secondary" href={`/assets/grouped?${qs.toString()}&page=${page + 1}`}>Next</Link>
            )}
          </div>
        </div>
      )}
      {user?.role !== "ADMIN" && rows.length >= 20_000 && (
        <p className="text-xs text-gray-500">
          Showing the first 20,000 line items in this filter. Narrow the filters to see beyond that.
        </p>
      )}
    </div>
  );
}
