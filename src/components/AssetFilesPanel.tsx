"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Existing = {
  images: { id: string; filename: string; storagePath: string }[];
  documents: { id: string; kind: string; filename: string; storagePath: string }[];
};

export function AssetFilesPanel({
  assetPublicId,
  files,
  canEdit,
}: {
  assetPublicId: string;
  files: Existing;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(kind: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    const res = await fetch(`/api/assets/${assetPublicId}/upload`, { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Upload failed.");
      return;
    }
    e.target.value = "";
    router.refresh();
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Images ({files.images.length})</h3>
        {files.images.length === 0 && <p className="text-sm text-gray-500">No images uploaded.</p>}
        <div className="grid grid-cols-3 gap-2">
          {files.images.map((img) => (
            <a key={img.id} href={`/api/files/${img.storagePath}`} target="_blank" rel="noopener" className="block">
              <img src={`/api/files/${img.storagePath}`} alt={img.filename} className="h-24 w-full object-cover rounded border border-gray-200" />
            </a>
          ))}
        </div>
        {canEdit && (
          <label className="btn-secondary w-full mt-3 cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => upload("IMAGE", e)} disabled={busy} />
            {busy ? "Uploading…" : "Upload image"}
          </label>
        )}
      </div>
      <div className="card p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Documents ({files.documents.length})</h3>
        {files.documents.length === 0 && <p className="text-sm text-gray-500">No documents uploaded.</p>}
        <ul className="space-y-1 text-sm">
          {files.documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between">
              <a href={`/api/files/${doc.storagePath}`} target="_blank" rel="noopener" className="text-brand-700 hover:underline truncate">
                {doc.filename}
              </a>
              <span className="tag ml-2 shrink-0">{doc.kind}</span>
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="mt-3 grid gap-2">
            {(["INVOICE", "PO", "WARRANTY", "MANUAL", "CERTIFICATE", "OTHER"] as const).map((k) => (
              <label key={k} className="btn-secondary cursor-pointer text-xs">
                <input type="file" className="hidden" onChange={(e) => upload(k, e)} disabled={busy} />
                Upload {k.toLowerCase()}
              </label>
            ))}
          </div>
        )}
        {error && <p role="alert" className="text-xs text-red-600 mt-2">{error}</p>}
      </div>
    </div>
  );
}
