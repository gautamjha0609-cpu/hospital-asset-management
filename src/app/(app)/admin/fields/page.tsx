import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CustomFieldForm } from "@/components/CustomFieldForm";

export const dynamic = "force-dynamic";

export default async function CustomFieldsAdmin() {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") redirect("/dashboard");

  const fields = await prisma.customField.findMany({ orderBy: { displayOrder: "asc" } });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Custom asset fields</h1>
        <p className="text-sm text-gray-500">
          Add fields specific to your organisation without changing the code
          (e.g. Biomedical calibration date, contract number, warranty vendor).
        </p>
      </div>
      <CustomFieldForm />
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Label</th>
              <th>Key</th>
              <th>Type</th>
              <th>Required</th>
              <th>Applies to</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.id}>
                <td>{f.displayOrder}</td>
                <td>{f.label}</td>
                <td className="font-mono text-xs">{f.name}</td>
                <td>{f.type}</td>
                <td>{f.required ? "Yes" : "No"}</td>
                <td>{f.appliesToCategory ?? "All"}</td>
              </tr>
            ))}
            {fields.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-gray-500">
                  No custom fields yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
