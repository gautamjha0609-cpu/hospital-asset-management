import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserCreateForm } from "@/components/UserCreateForm";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UsersAdmin() {
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-gray-500">Manage login accounts and roles.</p>
      </div>
      <UserCreateForm />
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.name ?? "—"}</td>
                <td>
                  <span className={u.role === "ADMIN" ? "tag-blue" : "tag"}>{u.role}</span>
                </td>
                <td className="text-xs text-gray-500">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
