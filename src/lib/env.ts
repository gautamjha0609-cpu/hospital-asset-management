// Central place for env-var access with typed defaults. Never reference
// process.env in components; import from here instead.

export const env = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "insecure-dev-secret",
  PUBLIC_APP_URL:
    process.env.PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000",
  STORAGE_DRIVER: (process.env.STORAGE_DRIVER as "local" | "s3") ?? "local",
  STORAGE_LOCAL_ROOT: process.env.STORAGE_LOCAL_ROOT ?? "./storage/local",
  STORAGE_PUBLIC_BASE_URL:
    process.env.STORAGE_PUBLIC_BASE_URL ?? "/api/files",
} as const;

export function assetUrl(publicId: string): string {
  const base = env.PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}/assets/${publicId}`;
}
