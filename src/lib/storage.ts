// Pluggable file storage. Only "local" is implemented today; the interface
// lets a "s3" driver be dropped in for production without changing callers.

import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "./env";

export interface StorageDriver {
  put(key: string, data: Buffer, mimeType: string): Promise<void>;
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

let cached: StorageDriver | null = null;
export function storage(): StorageDriver {
  if (cached) return cached;
  // FOLLOWUP: implement S3Driver behind STORAGE_DRIVER=s3
  cached = new LocalDiskDriver(env.STORAGE_LOCAL_ROOT);
  return cached;
}
