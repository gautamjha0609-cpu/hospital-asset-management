"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, Keyboard, AlertCircle, CheckCircle2 } from "lucide-react";

type ScannedAsset = {
  id: string;
  publicId: string;
  name: string | null;
  description: string;
  tagCode: string | null;
  status: string;
  roomId: string | null;
  room: { name: string; code: string } | null;
};

export function ScanClient() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualQ, setManualQ] = useState("");
  const [hit, setHit] = useState<ScannedAsset | null>(null);
  const [autoOpen, setAutoOpen] = useState(true);

  // Look up scanned/typed value against the API, then optionally navigate.
  async function resolve(q: string) {
    setBusy(true);
    setError(null);
    setHit(null);
    try {
      const res = await fetch(`/api/assets/lookup?q=${encodeURIComponent(q)}`);
      if (res.status === 404) {
        setError(`No asset matches "${q.slice(0, 60)}".`);
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Lookup failed.");
        return;
      }
      const j = (await res.json()) as { asset: ScannedAsset };
      setHit(j.asset);
      if (autoOpen) {
        router.push(`/assets/${j.asset.publicId}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function startCamera() {
    setError(null);
    try {
      // Dynamic import — keeps the scanner code out of the initial bundle.
      const mod = await import("html5-qrcode");
      const { Html5Qrcode } = mod;
      const el = containerRef.current;
      if (!el) return;
      el.id = "qr-reader";
      const scanner = new Html5Qrcode(el.id);
      scannerRef.current = scanner as unknown as { stop: () => Promise<void>; clear: () => void };
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (w: number, h: number) => {
            const s = Math.floor(Math.min(w, h) * 0.75);
            return { width: s, height: s };
          },
        },
        async (decodedText: string) => {
          // Stop first so we don't fire twice
          await scanner.stop().catch(() => {});
          setCameraOn(false);
          await resolve(decodedText);
        },
        () => {
          // per-frame error — ignore
        }
      );
      setCameraOn(true);
    } catch (e) {
      setError(
        (e as Error)?.message?.includes("Permission")
          ? "Camera permission denied. Enable camera access in your browser settings, or use the tag box below."
          : `Could not start camera: ${(e as Error)?.message ?? "unknown error"}.`
      );
    }
  }

  async function stopCamera() {
    try {
      await scannerRef.current?.stop();
      scannerRef.current?.clear();
    } catch {
      /* noop */
    }
    setCameraOn(false);
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="card p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoOpen}
              onChange={(e) => setAutoOpen(e.target.checked)}
            />
            Open asset automatically after scan
          </label>
          {cameraOn ? (
            <button className="btn-secondary" onClick={stopCamera}>
              <CameraOff className="h-4 w-4" /> Stop
            </button>
          ) : (
            <button className="btn-primary" onClick={startCamera}>
              <Camera className="h-4 w-4" /> Start camera
            </button>
          )}
        </div>
        <div
          ref={containerRef}
          className="w-full bg-black/5 rounded-md overflow-hidden"
          style={{ minHeight: cameraOn ? 300 : 0 }}
          aria-live="polite"
        />
        <p className="text-xs text-gray-500">
          Tip: print each asset's QR from its detail page — "QR code" button
          top-right. Every QR encodes the asset's stable URL.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manualQ.trim()) resolve(manualQ.trim());
        }}
        className="card p-3 flex items-center gap-2"
      >
        <Keyboard className="h-4 w-4 text-gray-400" />
        <input
          className="input flex-1"
          value={manualQ}
          onChange={(e) => setManualQ(e.target.value)}
          placeholder="Or type tag / serial / barcode…"
        />
        <button className="btn-primary" disabled={busy || !manualQ.trim()}>
          {busy ? "Looking up…" : "Find"}
        </button>
      </form>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          {error}
        </div>
      )}

      {hit && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 mt-0.5" />
          <div>
            <div className="font-medium">
              Matched: {hit.name ?? hit.tagCode ?? hit.description.slice(0, 60)}
            </div>
            {hit.tagCode && <div className="text-xs">Tag {hit.tagCode}</div>}
            {hit.room && (
              <div className="text-xs">
                Current room: {hit.room.name} ({hit.room.code})
              </div>
            )}
            {!autoOpen && (
              <a
                className="text-brand-700 underline text-xs"
                href={`/assets/${hit.publicId}`}
              >
                Open asset →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
