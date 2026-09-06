"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}

function ResetInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";

  const [check, setCheck] = useState<
    null | { valid: true; maskedEmail: string; expiresAt: string } | { valid: false; reason: string }
  >(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setCheck({ valid: false, reason: "missing" });
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then(setCheck)
      .catch(() => setCheck({ valid: false, reason: "network" }));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Something went wrong.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Image
            src="/brand/logo-640.png"
            alt="CK Birla Hospitals | Rukmani Birla Hospital"
            width={480}
            height={140}
            className="mx-auto w-56 h-auto"
          />
          <h1 className="mt-4 text-lg font-semibold text-gray-900">Set a new password</h1>
        </div>

        {check === null ? (
          <div className="card p-6 text-center text-sm text-gray-500">Verifying link…</div>
        ) : !check.valid ? (
          <div className="card p-6 space-y-3 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="text-sm">
              {check.reason === "expired" && "This reset link has expired. Request a new one."}
              {check.reason === "used" && "This link has already been used. Request a new one."}
              {check.reason === "unknown" && "This link isn't valid. Request a new one."}
              {check.reason === "missing" && "No reset token found in the URL."}
              {check.reason === "network" && "Could not verify the link. Try again."}
            </p>
            <Link className="btn-primary" href="/forgot-password">Request a new link</Link>
          </div>
        ) : done ? (
          <div className="card p-6 text-center space-y-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
            <p className="text-sm">
              Password updated. Redirecting to sign in…
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="card p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Setting a new password for <span className="font-medium">{check.maskedEmail}</span>.
              Must be at least 8 characters and include a letter and a number.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Saving…" : "Set new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
