"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { Building2, ArrowLeft, MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotInner />
    </Suspense>
  );
}

function ForgotInner() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { deliveryConfigured: boolean }>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Something went wrong.");
      return;
    }
    setDone(await res.json());
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto h-12 w-12 rounded-xl bg-brand-600 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-3 text-xl font-semibold text-gray-900">Reset your password</h1>
          <p className="text-sm text-gray-500">
            Enter your account email — we'll send you a link.
          </p>
        </div>

        {done ? (
          <div className="card p-6 text-center space-y-3">
            <MailCheck className="h-8 w-8 text-emerald-600 mx-auto" />
            <p className="text-sm">
              If <span className="font-medium">{email}</span> matches an account,
              a reset link has been sent. Check your inbox — the link expires
              in 1 hour.
            </p>
            {!done.deliveryConfigured && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                Email delivery isn't configured on this deployment. Ask your
                admin to open <code>/admin/users</code> and click "Reset
                password" next to your name — they can send you the link
                directly.
              </p>
            )}
            <Link className="btn-secondary" href="/login">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="card p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                required
                type="email"
                autoComplete="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </button>
            <Link className="btn-ghost w-full justify-center" href="/login">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
