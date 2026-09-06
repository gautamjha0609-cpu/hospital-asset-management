"use client";
import { useState } from "react";
import { KeyRound, Copy, Check, X } from "lucide-react";

export function UserResetButton({ userId, email }: { userId: string; email: string }) {
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<null | {
    link: string;
    email: string;
    expiresAt: string;
    emailed: boolean;
    emailError: string | null;
  }>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function issue() {
    setError(null);
    if (
      !confirm(
        `Issue a password reset link for ${email}?\n\nThe link is one-time-use and expires in 1 hour.`
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to issue reset link.");
      return;
    }
    setModal(await res.json());
  }

  async function copy() {
    if (!modal) return;
    try {
      await navigator.clipboard.writeText(modal.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn-secondary text-xs"
        onClick={issue}
        disabled={busy}
      >
        <KeyRound className="h-3.5 w-3.5" /> {busy ? "Working…" : "Reset password"}
      </button>
      {error && <p role="alert" className="text-xs text-red-600 mt-1">{error}</p>}

      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="dialog" aria-modal>
          <div className="card p-5 w-full max-w-lg space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold">Reset link for {modal.email}</h3>
              <button className="btn-ghost p-1" aria-label="Close" onClick={() => setModal(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            {modal.emailed ? (
              <p className="text-sm text-emerald-700">
                The link has been emailed to <span className="font-medium">{modal.email}</span>.
                If they don't receive it, share the link below directly.
              </p>
            ) : (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                Email is not configured on this deployment. Share the link below
                with the user via WhatsApp, SMS, or in person. It works even
                without email.
              </p>
            )}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">Reset link (expires in 1 hour, single-use)</label>
              <div className="flex gap-2">
                <input readOnly className="input font-mono text-xs" value={modal.link} onFocus={(e) => e.currentTarget.select()} />
                <button className="btn-primary" onClick={copy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-gray-500">
              Once the user opens the link and sets a new password, this link
              becomes invalid.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
