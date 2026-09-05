import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { FloorCreateForm } from "@/components/FloorCreateForm";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BuildingDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  const b = await prisma.building.findUnique({
    where: { id },
    include: {
      floors: {
        orderBy: [{ levelIndex: "asc" }, { floorNumber: "asc" }],
        include: {
          _count: { select: { rooms: true, assets: true } },
        },
      },
    },
  });
  if (!b) notFound();

  const assetAgg = await prisma.asset.aggregate({
    where: { floor: { buildingId: b.id } },
    _sum: { costGrossBlock: true },
    _count: true,
  });
  const [movable, immovable] = await Promise.all([
    prisma.asset.count({ where: { floor: { buildingId: b.id }, assetType: "MOVABLE" } }),
    prisma.asset.count({ where: { floor: { buildingId: b.id }, assetType: "IMMOVABLE" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-gray-500">Building</div>
        <h1 className="text-2xl font-semibold">{b.name}</h1>
        <p className="text-sm text-gray-500">
          Code {b.code}
          {b.address ? ` · ${b.address}` : ""}
        </p>
      </div>

      <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Stat label="Floors" value={b.floors.length.toString()} />
        <Stat label="Assets" value={assetAgg._count.toString()} />
        <Stat label="Movable / Immovable" value={`${movable} / ${immovable}`} />
        <Stat label="Gross block" value={formatCurrency(assetAgg._sum.costGrossBlock ?? 0)} />
      </section>

      {user?.role === "ADMIN" && <FloorCreateForm buildingId={b.id} />}

      <section className="card p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Floors</h2>
        {b.floors.length === 0 ? (
          <p className="text-sm text-gray-500">No floors defined yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Floor</th>
                <th>#</th>
                <th>Rooms</th>
                <th>Assets</th>
                <th className="w-40"></th>
              </tr>
            </thead>
            <tbody>
              {b.floors.map((f) => (
                <tr key={f.id}>
                  <td>
                    <Link href={`/floors/${f.id}`} className="text-brand-700 hover:underline font-medium">
                      {f.name}
                    </Link>
                  </td>
                  <td>{f.floorNumber}</td>
                  <td>{f._count.rooms}</td>
                  <td>{f._count.assets}</td>
                  <td>
                    <Link href={`/floors/${f.id}`} className="btn-secondary text-xs">Open map</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
