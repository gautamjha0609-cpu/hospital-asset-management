import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { ROOM_TYPE_LABEL, type RoomType } from "@/lib/location";
import { displayName } from "@/lib/asset";

export const dynamic = "force-dynamic";

export default async function RoomPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await props.params;
  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      floor: { include: { building: true } },
      assets: {
        orderBy: [{ tagCode: "asc" }, { description: "asc" }],
      },
    },
  });
  if (!room) notFound();

  const movable = room.assets.filter((a) => a.assetType === "MOVABLE").length;
  const immovable = room.assets.filter((a) => a.assetType === "IMMOVABLE").length;

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500 flex items-center gap-2">
        <Link href="/buildings" className="hover:underline">Buildings</Link>
        <span>/</span>
        <Link href={`/buildings/${room.floor.building.id}`} className="hover:underline">{room.floor.building.name}</Link>
        <span>/</span>
        <Link href={`/floors/${room.floor.id}`} className="hover:underline">{room.floor.name}</Link>
        <span>/</span>
        <span className="text-gray-700">{room.name}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <div className="text-xs text-gray-500">{ROOM_TYPE_LABEL[room.type as RoomType] ?? room.type}</div>
          <h1 className="text-2xl font-semibold">{room.name}</h1>
          <p className="text-sm text-gray-500">Code {room.code}</p>
        </div>
        <Link href={`/floors/${room.floor.id}`} className="btn-secondary">
          View on map
        </Link>
      </div>

      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="Assets" value={room.assets.length.toString()} />
        <Stat label="Movable" value={movable.toString()} />
        <Stat label="Immovable" value={immovable.toString()} />
        <Stat
          label="Gross block"
          value={formatCurrency(room.assets.reduce((s, a) => s + (a.costGrossBlock ?? 0), 0))}
        />
      </section>

      <section className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Description</th>
              <th>Type</th>
              <th>Status</th>
              <th>Value</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {room.assets.map((a) => (
              <tr key={a.id}>
                <td className="font-mono text-xs">{a.tagCode ?? "—"}</td>
                <td className="max-w-lg">
                  <Link className="text-brand-700 hover:underline" href={`/assets/${a.publicId}`}>
                    {displayName(a)}
                  </Link>
                </td>
                <td>{a.assetType}</td>
                <td>{a.status}</td>
                <td>{formatCurrency(a.costGrossBlock ?? 0)}</td>
                <td>
                  <Link className="text-xs text-brand-600 hover:underline" href={`/assets/${a.publicId}`}>Open</Link>
                </td>
              </tr>
            ))}
            {room.assets.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-sm text-gray-500 py-6">No assets in this room yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
