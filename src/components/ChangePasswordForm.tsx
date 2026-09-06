"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { KeyRound } from "lucide-react";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to change password.");
      return;
    }
    setOk(true);
    setCurrent(""); setNext(""); setConfirm("");
  }

  return (
    <div className="card p-5">
      <h2 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
        <KeyRound className="h-4 w-4" /> Change password
      </h2>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Current password</label>
          <input required type="password" autoComplete="current-password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">New password</label>
          <input required type="password" minLength={8} autoComplete="new-password" className="input" value={next} onChange={(e) => setNext(e.target.value)} />
          <p className="text-[11px] text-gray-500 mt-1">At least 8 characters, with a letter and a number.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Confirm new password</label>
          <input required type="password" minLength={8} autoComplete="new-password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {ok && (
          <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800 flex items-center justify-between">
            <span>Password updated.</span>
            <button type="button" className="btn-ghost text-xs" onClick={() => signOut({ callbackUrl: "/login" })}>
              Sign out and back in
            </button>
          </div>
        )}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
