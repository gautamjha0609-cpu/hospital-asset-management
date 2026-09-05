import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Map } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MapIndex() {
  const buildings = await prisma.building.findMany({
    orderBy: { name: "asc" },
    include: {
      floors: {
        orderBy: [{ levelIndex: "asc" }],
        include: { _count: { select: { rooms: true, assets: true } } },
      },
    },
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Floor maps</h1>
        <p className="text-sm text-gray-500">Pick a floor to view or edit its map.</p>
      </div>
      {buildings.length === 0 ? (
        <div className="card p-8 text-center">
          <Map className="h-8 w-8 text-gray-300 mx-auto" />
          <p className="mt-2 text-sm text-gray-500">No buildings or floors yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {buildings.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="text-xs text-gray-500">{b.code}</div>
              <div className="text-lg font-semibold">{b.name}</div>
              <ul className="mt-2 space-y-1">
                {b.floors.map((f) => (
                  <li key={f.id} className="flex items-center justify-between text-sm">
                    <Link href={`/floors/${f.id}`} className="text-brand-700 hover:underline">
                      {f.name}
                    </Link>
                    <span className="text-xs text-gray-500">
                      {f._count.rooms} rooms · {f._count.assets} assets
                    </span>
                  </li>
                ))}
                {b.floors.length === 0 && (
                  <li className="text-xs text-gray-400">No floors defined.</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
