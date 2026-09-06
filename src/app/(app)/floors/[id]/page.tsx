import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { FloorMap } from "@/components/map/FloorMap";

export const dynamic = "force-dynamic";

export default async function FloorPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  const floor = await prisma.floor.findUnique({
    where: { id },
    include: {
      building: true,
      rooms: true,
      mapObjects: true,
      assets: {
        // All assets currently assigned to a room on this floor (placed
        // or unplaced) — the map lets admins drag unplaced ones onto the
        // canvas.
        select: {
          id: true,
          publicId: true,
          description: true,
          name: true,
          tagCode: true,
          status: true,
          mapX: true,
          mapY: true,
          roomId: true,
        },
        take: 1000,
        orderBy: [{ mapX: "asc" }, { tagCode: "asc" }],
      },
    },
  });
  if (!floor) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/buildings" className="hover:underline">Buildings</Link>
        <span>/</span>
        <Link href={`/buildings/${floor.building.id}`} className="hover:underline">
          {floor.building.name}
        </Link>
        <span>/</span>
        <span className="text-gray-700">{floor.name}</span>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{floor.name}</h1>
          <p className="text-sm text-gray-500">
            Floor #{floor.floorNumber} · {floor.rooms.length} rooms · {floor.assets.length} placed assets
          </p>
        </div>
      </div>

      <FloorMap
        floorId={floor.id}
        planWidth={floor.planWidth}
        planHeight={floor.planHeight}
        isAdmin={user?.role === "ADMIN"}
        initialRooms={floor.rooms.map((r) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          type: r.type,
          geometry: r.geometry,
          labelX: r.labelX,
          labelY: r.labelY,
        }))}
        initialMapObjects={floor.mapObjects.map((o) => ({
          id: o.id,
          kind: o.kind,
          data: o.data,
        }))}
        initialAssets={floor.assets
          .filter((a) => a.mapX != null && a.mapY != null)
          .map((a) => ({
            id: a.id,
            publicId: a.publicId,
            label: a.name ?? a.tagCode ?? a.description.slice(0, 60),
            status: a.status,
            x: a.mapX ?? 100,
            y: a.mapY ?? 100,
          }))}
        unplacedAssets={floor.assets
          .filter((a) => a.mapX == null || a.mapY == null)
          .map((a) => ({
            id: a.id,
            publicId: a.publicId,
            label: a.name ?? a.tagCode ?? a.description.slice(0, 60),
            status: a.status,
            roomId: a.roomId,
          }))}
        rooms={floor.rooms.map((r) => ({ id: r.id, name: r.name, code: r.code }))}
      />
    </div>
  );
}
