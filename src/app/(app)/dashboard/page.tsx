import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import {
  Package,
  Building2,
  MapPin,
  Layers,
  AlertTriangle,
  Upload,
  Search,
  Plus,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const [
    totalAssets,
    movable,
    immovable,
    buildings,
    floors,
    rooms,
    missingLocation,
    missingImages,
    grossBlockAgg,
    recentMoves,
  ] = await Promise.all([
    prisma.asset.count(),
    prisma.asset.count({ where: { assetType: "MOVABLE" } }),
    prisma.asset.count({ where: { assetType: "IMMOVABLE" } }),
    prisma.building.count(),
    prisma.floor.count(),
    prisma.room.count(),
    prisma.asset.count({ where: { roomId: null } }),
    prisma.asset.count({ where: { images: { none: {} } } }),
    prisma.asset.aggregate({ _sum: { costGrossBlock: true } }),
    prisma.assetLocationHistory.findMany({
      take: 6,
      orderBy: { movedAt: "desc" },
      include: {
        asset: { select: { id: true, publicId: true, description: true, tagCode: true } },
        room: { select: { id: true, name: true, code: true } },
      },
    }),
  ]);

  const stats = [
    { label: "Total assets", value: totalAssets.toLocaleString("en-IN"), icon: Package },
    { label: "Movable", value: movable.toLocaleString("en-IN"), icon: Package },
    { label: "Immovable", value: immovable.toLocaleString("en-IN"), icon: Package },
    { label: "Buildings", value: buildings.toString(), icon: Building2 },
    { label: "Floors", value: floors.toString(), icon: Layers },
    { label: "Rooms", value: rooms.toString(), icon: MapPin },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Welcome{user?.name ? `, ${user.name}` : ""}. Here's the current state
            of the hospital's asset inventory.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {user?.role === "ADMIN" && (
            <>
              <Link href="/assets/new" className="btn-primary">
                <Plus className="h-4 w-4" /> Add asset
              </Link>
              <Link href="/admin/import" className="btn-secondary">
                <Upload className="h-4 w-4" /> Import Excel
              </Link>
            </>
          )}
          <Link href="/search" className="btn-secondary">
            <Search className="h-4 w-4" /> Search
          </Link>
        </div>
      </header>

      <section className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wide text-gray-500">{s.label}</div>
                <Icon className="h-4 w-4 text-gray-400" />
              </div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">{s.value}</div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <div className="text-sm font-medium text-gray-500 mb-1">
            Total gross block value
          </div>
          <div className="text-3xl font-semibold text-gray-900">
            {formatCurrency(grossBlockAgg._sum.costGrossBlock ?? 0)}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Sum of <code>Cost (Gross Block)</code> from the fixed-asset register.
          </p>
        </div>
        <div className="card p-5">
          <div className="text-sm font-medium text-gray-500 mb-1">
            Attention needed
          </div>
          <ul className="mt-2 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>
                {missingLocation.toLocaleString("en-IN")} assets have no assigned room
              </span>
            </li>
            <li className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>
                {missingImages.toLocaleString("en-IN")} assets have no images
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-700">Recent movements</h2>
          <Link href="/assets" className="text-xs text-brand-600 hover:underline">
            View all assets →
          </Link>
        </div>
        {recentMoves.length === 0 ? (
          <p className="text-sm text-gray-500">No asset movements recorded yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentMoves.map((m) => (
              <li key={m.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <Link
                    href={`/assets/${m.asset.publicId}`}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {m.asset.tagCode ?? m.asset.description.slice(0, 60)}
                  </Link>
                  <div className="text-xs text-gray-500">
                    → {m.room?.name ?? "unassigned"} · {new Date(m.movedAt).toLocaleString("en-IN")}
                  </div>
                </div>
                {m.reason && <span className="tag">{m.reason}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
