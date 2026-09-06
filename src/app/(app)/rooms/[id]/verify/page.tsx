import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { VerifyClient } from "@/components/VerifyClient";

export const dynamic = "force-dynamic";

export default async function VerifyRoomPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) return null;

  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      floor: { include: { building: true } },
      assets: {
        orderBy: [{ tagCode: "asc" }, { description: "asc" }],
        select: {
          id: true,
          publicId: true,
          name: true,
          description: true,
          tagCode: true,
          status: true,
          lastVerifiedAt: true,
        },
      },
    },
  });
  if (!room) notFound();

  // Available rooms on the same floor as move targets
  const roomsOnFloor = await prisma.room.findMany({
    where: { floorId: room.floorId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="text-xs text-gray-500 flex flex-wrap gap-2">
        <Link href="/buildings" className="hover:underline">Buildings</Link>/
        <Link href={`/buildings/${room.floor.building.id}`} className="hover:underline">{room.floor.building.name}</Link>/
        <Link href={`/floors/${room.floor.id}`} className="hover:underline">{room.floor.name}</Link>/
        <Link href={`/rooms/${room.id}`} className="hover:underline">{room.name}</Link>/
        <span className="text-gray-700">Verify</span>
      </div>

      <header>
        <h1 className="text-2xl font-semibold">Verify room: {room.name}</h1>
        <p className="text-sm text-gray-500">
          Walk the room and mark each asset. Missing → status LOST. Condemned →
          status CONDEMNED. Moved → give the new room. Present → keeps it here
          and moves it in if it wasn't already.
        </p>
      </header>

      <VerifyClient
        room={{ id: room.id, name: room.name, code: room.code, floorName: room.floor.name }}
        assets={room.assets}
        roomsOnFloor={roomsOnFloor.filter((r) => r.id !== room.id)}
      />
    </div>
  );
}
