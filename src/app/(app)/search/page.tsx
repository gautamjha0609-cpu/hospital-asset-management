import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { displayName } from "@/lib/asset";

export const dynamic = "force-dynamic";

export default async function SearchPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await props.searchParams;
  const q = (sp.q ?? "").trim();

  let assets: Awaited<ReturnType<typeof runSearch>> = [];
  if (q) assets = await runSearch(q);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Global search</h1>
        <p className="text-sm text-gray-500">Search across asset tag, name, serial, barcode, vendor, room, and voucher.</p>
      </div>

      <form method="get" className="card p-3 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          className="input flex-1"
          placeholder="Search…"
          autoFocus
        />
        <button className="btn-primary">Search</button>
      </form>

      {q && (
        <p className="text-sm text-gray-500">
          {assets.length.toLocaleString("en-IN")} result{assets.length === 1 ? "" : "s"} for
          <span className="ml-1 font-mono">"{q}"</span>
        </p>
      )}

      {assets.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Description</th>
                <th>Category</th>
                <th>Vendor</th>
                <th>Location</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id}>
                  <td className="font-mono text-xs">{a.tagCode ?? "—"}</td>
                  <td className="max-w-md">
                    <Link className="text-brand-700 hover:underline" href={`/assets/${a.publicId}`}>
                      {displayName(a)}
                    </Link>
                  </td>
                  <td className="text-xs">{a.majorCategory?.name}</td>
                  <td className="text-xs">{a.vendor?.name ?? "—"}</td>
                  <td className="text-xs">
                    {a.room ? (
                      <Link href={`/rooms/${a.room.id}`} className="hover:underline">
                        {a.room.floor?.building?.name} · {a.room.name}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="text-xs">{formatCurrency(a.costGrossBlock)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function runSearch(q: string) {
  return prisma.asset.findMany({
    where: {
      OR: [
        { tagCode: { contains: q } },
        { description: { contains: q } },
        { serialNumber: { contains: q } },
        { modelNumber: { contains: q } },
        { barcode: { contains: q } },
        { voucherNumber: { contains: q } },
        { manufacturer: { contains: q } },
        { vendor: { name: { contains: q } } },
        { room: { name: { contains: q } } },
        { department: { name: { contains: q } } },
      ],
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
    include: {
      majorCategory: { select: { name: true } },
      vendor: { select: { name: true } },
      room: { select: { id: true, name: true, floor: { select: { building: { select: { name: true } } } } } },
    },
  });
}
