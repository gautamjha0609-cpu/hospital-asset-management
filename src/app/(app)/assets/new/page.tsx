import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssetForm } from "@/components/AssetForm";

export const dynamic = "force-dynamic";

export default async function NewAssetPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/assets");

  const [majors, finals, subs, vendors, departments, costCenters, buildings] = await Promise.all([
    prisma.majorCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.finalCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.subCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, take: 500 }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.costCenter.findMany({ orderBy: { code: "asc" } }),
    prisma.building.findMany({ orderBy: { name: "asc" }, include: { floors: { include: { rooms: true } } } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New asset</h1>
      <AssetForm
        mode="create"
        options={{ majors, finals, subs, vendors, departments, costCenters, buildings }}
      />
    </div>
  );
}
