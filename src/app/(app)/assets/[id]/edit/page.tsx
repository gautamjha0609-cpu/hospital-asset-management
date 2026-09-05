import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssetForm } from "@/components/AssetForm";

export const dynamic = "force-dynamic";

export default async function EditAssetPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect(`/assets/${id}`);

  const [asset, majors, finals, subs, vendors, departments, costCenters, buildings] = await Promise.all([
    prisma.asset.findFirst({ where: { OR: [{ publicId: id }, { id }] } }),
    prisma.majorCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.finalCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.subCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, take: 500 }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.costCenter.findMany({ orderBy: { code: "asc" } }),
    prisma.building.findMany({ orderBy: { name: "asc" }, include: { floors: { include: { rooms: true } } } }),
  ]);
  if (!asset) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit asset</h1>
      <AssetForm
        mode="edit"
        asset={asset}
        options={{ majors, finals, subs, vendors, departments, costCenters, buildings }}
      />
    </div>
  );
}
