"use client";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

// Registers the service worker and offers an "Install app" chip when the
// browser fires beforeinstallprompt (Android / desktop Chrome / Edge).
// iOS Safari has no programmatic install prompt — the sw + manifest
// still make "Add to Home Screen" work from the share sheet, and we
// show a one-time hint for that case.

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PWARegister() {
  const [prompt, setPrompt] = useState<BIPEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onBIP = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS Safari standalone detection
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    // @ts-expect-error non-standard
    const standalone = window.navigator.standalone === true;
    const alreadyHinted = localStorage.getItem("rbh:iosHint") === "1";
    if (isIos && !standalone && !alreadyHinted) {
      setIosHint(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setPrompt(null);
  }

  function closeIosHint() {
    setIosHint(false);
    try {
      localStorage.setItem("rbh:iosHint", "1");
    } catch {
      /* noop */
    }
  }

  if (prompt && !dismissed) {
    return (
      <div className="fixed bottom-4 right-4 z-40 card p-3 shadow-lg flex items-center gap-3 max-w-sm">
        <div className="text-sm">
          <div className="font-medium">Install RBH Assets</div>
          <div className="text-xs text-gray-500">
            Get one-tap access from your home screen.
          </div>
        </div>
        <button className="btn-primary" onClick={install}>
          <Download className="h-4 w-4" /> Install
        </button>
        <button
          className="btn-ghost p-1"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (iosHint) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-40 card p-3 shadow-lg flex items-start gap-2 max-w-md mx-auto">
        <div className="text-xs text-gray-700">
          <div className="font-medium text-gray-900 mb-1">Install on your iPhone</div>
          Tap <span className="font-semibold">Share</span> then{" "}
          <span className="font-semibold">Add to Home Screen</span> to install
          RBH Assets as an app.
        </div>
        <button className="btn-ghost p-1" aria-label="Dismiss" onClick={closeIosHint}>
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return null;
}
