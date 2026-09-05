"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function UserCreateForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setBusy(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, role }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to create user.");
      return;
    }
    setEmail(""); setPassword(""); setName("");
    setOk("User created.");
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="card p-4 grid gap-3 md:grid-cols-5 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
        <input required type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
        <input required type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "USER")}>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>
      <button className="btn-primary" disabled={busy}>{busy ? "Creating…" : "Create user"}</button>
      {error && <p role="alert" className="md:col-span-5 text-sm text-red-600">{error}</p>}
      {ok && <p className="md:col-span-5 text-sm text-emerald-600">{ok}</p>}
    </form>
  );
}
