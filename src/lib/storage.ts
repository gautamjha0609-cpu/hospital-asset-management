// Pluggable file storage.
//
// Drivers:
//   STORAGE_DRIVER=local        -> writes under ./storage/local (dev only)
//   STORAGE_DRIVER=vercel-blob  -> Vercel Blob (production on Vercel)
//
// Callers stay driver-agnostic: put(key, bytes, mime), then use
// publicUrl(key) to display the file. For local, the URL goes through
// the /api/files/[...key] route (auth-gated). For vercel-blob, publicUrl
// returns the CDN URL directly, and the /api/files route becomes a no-op
// (the DB stores the CDN URL as storagePath).

import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "./env";

export interface StorageDriver {
  put(key: string, data: Buffer, mimeType: string): Promise<{ url: string; storagePath: string }>;
  get(key: string): Promise<Buffer | null>;
  publicUrl(key: string): string;
  delete(key: string): Promise<void>;
}

class LocalDiskDriver implements StorageDriver {
  private readonly root: string;
  constructor(root: string) {
    this.root = path.resolve(process.cwd(), root);
  }
  private full(key: string) {
    const safe = key.replace(/^\/+/, "").replace(/\.\./g, "_");
    return path.join(this.root, safe);
  }
  async put(key: string, data: Buffer) {
    const p = this.full(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, data);
    return { url: this.publicUrl(key), storagePath: key };
  }
  async get(key: string) {
    try {
      return await fs.readFile(this.full(key));
    } catch {
      return null;
    }
  }
  publicUrl(key: string) {
    return `${env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key.replace(/^\/+/, "")}`;
  }
  async delete(key: string) {
    try {
      await fs.unlink(this.full(key));
    } catch {
      /* noop */
    }
  }
}

// Vercel Blob driver. Uses BLOB_READ_WRITE_TOKEN, injected by Vercel when
// the Blob integration is enabled on the project. Files are public-read
// (per-asset URLs are already gated by auth on the asset page itself; the
// Blob CDN URL is not enumerable but is not secret either — do not put
// PHI/PII here without turning the bucket private and signing URLs).
class VercelBlobDriver implements StorageDriver {
  async put(key: string, data: Buffer, mimeType: string) {
    const { put } = await import("@vercel/blob");
    const res = await put(key, data, {
      access: "public",
      contentType: mimeType,
      addRandomSuffix: false,
    });
    // storagePath stores the full CDN URL so publicUrl() is a no-op lookup.
    return { url: res.url, storagePath: res.url };
  }
  async get(_key: string): Promise<Buffer | null> {
    // Reads go directly through the CDN URL from the browser; the server
    // does not need to proxy for the Blob driver.
    return null;
  }
  publicUrl(key: string) {
    // storagePath already IS the URL when this driver put it there.
    return key;
  }
  async delete(key: string) {
    const { del } = await import("@vercel/blob");
    try {
      await del(key);
    } catch {
      /* noop */
    }
  }
}

let cached: StorageDriver | null = null;
export function storage(): StorageDriver {
  if (cached) return cached;
  if (env.STORAGE_DRIVER === "vercel-blob") {
    cached = new VercelBlobDriver();
  } else {
    cached = new LocalDiskDriver(env.STORAGE_LOCAL_ROOT);
  }
  return cached;
}
