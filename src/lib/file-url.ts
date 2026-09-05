// A storagePath is either:
//   - a relative key (local driver) -> served through /api/files/<key>
//   - a full https:// URL           -> served directly by the CDN (Vercel Blob)
// Callers use this helper so they never have to know which driver stored it.
export function fileUrl(storagePath: string): string {
  if (/^https?:\/\//.test(storagePath)) return storagePath;
  return `/api/files/${storagePath.replace(/^\/+/, "")}`;
}
