import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Plus, Building2 } from "lucide-react";
import { BuildingCreateForm } from "@/components/BuildingCreateForm";

export const dynamic = "force-dynamic";

export default async function BuildingsPage() {
  const user = await getCurrentUser();
  const buildings = await prisma.building.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { floors: true } },
      floors: {
        orderBy: { levelIndex: "asc" },
        select: { id: true, name: true, floorNumber: true, _count: { select: { rooms: true, assets: true } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Buildings</h1>
          <p className="text-sm text-gray-500">
            The hospital's building → floor → room hierarchy. Assets live in rooms.
          </p>
        </div>
      </header>

      {user?.role === "ADMIN" && <BuildingCreateForm />}

      {buildings.length === 0 ? (
        <div className="card p-8 text-center">
          <Building2 className="h-8 w-8 text-gray-300 mx-auto" />
          <p className="mt-2 text-sm text-gray-500">
            No buildings yet.{" "}
            {user?.role === "ADMIN" ? "Use the form above to create one." : "Ask an admin to set one up."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {buildings.map((b) => (
            <div key={b.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-gray-500">{b.code}</div>
                  <Link
                    href={`/buildings/${b.id}`}
                    className="text-lg font-semibold text-gray-900 hover:underline"
                  >
                    {b.name}
                  </Link>
                  {b.address && <div className="text-sm text-gray-500 mt-1">{b.address}</div>}
                </div>
                <span className="tag">{b._count.floors} floors</span>
              </div>
              <ul className="mt-4 space-y-1">
                {b.floors.map((f) => (
                  <li key={f.id} className="text-sm flex items-center justify-between">
                    <Link href={`/floors/${f.id}`} className="text-brand-700 hover:underline">
                      {f.name}
                    </Link>
                    <span className="text-xs text-gray-500">
                      {f._count.rooms} rooms · {f._count.assets} assets
                    </span>
                  </li>
                ))}
                {b.floors.length === 0 && (
                  <li className="text-xs text-gray-400">No floors yet.</li>
                )}
              </ul>
              {user?.role === "ADMIN" && (
                <div className="mt-4">
                  <Link href={`/buildings/${b.id}`} className="btn-secondary w-full">
                    <Plus className="h-4 w-4" /> Manage floors
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
