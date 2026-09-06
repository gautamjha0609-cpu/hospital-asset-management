import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AssetFilters } from "@/components/AssetFilters";
import type { Prisma } from "@prisma/client";
import { Plus, Download } from "lucide-react";
import { AssetsListClient } from "@/components/AssetsListClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AssetsPage(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  const sp = await props.searchParams;
  const q = (sp.q ?? "").trim();
  const majorCategoryId = sp.majorCategoryId;
  const finalCategoryId = sp.finalCategoryId;
  const departmentId = sp.departmentId;
  const buildingId = sp.buildingId;
  const roomId = sp.roomId;
  const assetType = sp.assetType;
  const status = sp.status;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

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
  if (majorCategoryId) where.majorCategoryId = majorCategoryId;
  if (finalCategoryId) where.finalCategoryId = finalCategoryId;
  if (departmentId) where.departmentId = departmentId;
  if (buildingId) where.floor = { buildingId };
  if (roomId) where.roomId = roomId;
  if (assetType) where.assetType = assetType;
  if (status) where.status = status;

  const [total, assets, majors, finals, departments, buildings, buildingsFull] = await Promise.all([
    prisma.asset.count({ where }),
    prisma.asset.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        majorCategory: { select: { name: true } },
        finalCategory: { select: { name: true } },
        department: { select: { name: true } },
        vendor: { select: { name: true } },
        room: {
          select: {
            id: true,
            name: true,
            code: true,
            floor: { select: { building: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.majorCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.finalCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.building.findMany({ orderBy: { name: "asc" } }),
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
            rooms: {
              orderBy: { name: "asc" },
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => {
    if (v && k !== "page") qs.set(k, v);
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Assets</h1>
          <p className="text-sm text-gray-500">{total.toLocaleString("en-IN")} total</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {user?.role === "ADMIN" && (
            <Link href="/assets/new" className="btn-primary">
              <Plus className="h-4 w-4" /> New asset
            </Link>
          )}
          <a href={`/api/assets/export?${qs.toString()}`} className="btn-secondary">
            <Download className="h-4 w-4" /> Export XLSX
          </a>
        </div>
      </header>

      <AssetFilters
        majors={majors}
        finals={finals}
        departments={departments}
        buildings={buildings}
      />

      <AssetsListClient
        rows={assets}
        buildings={buildingsFull}
        canBulk={user?.role === "ADMIN"}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div>
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link className="btn-secondary" href={`/assets?${qs.toString()}&page=${page - 1}`}>
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link className="btn-secondary" href={`/assets?${qs.toString()}&page=${page + 1}`}>
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
