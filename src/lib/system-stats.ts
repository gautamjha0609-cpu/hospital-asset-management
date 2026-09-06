import { prisma } from "./prisma";

export type SystemStats = {
  provider: "postgresql" | "sqlite" | "unknown";
  databaseSizeBytes: number | null;
  databaseName: string | null;
  tableCounts: Record<string, number>;
  audit: {
    total: number;
    oldest: Date | null;
    retentionDays: number;
    wouldPruneOlderThan: Date;
    wouldPruneCount: number;
  };
  storage: {
    imageCount: number;
    documentCount: number;
  };
  plan: {
    hobbyPostgresLimitMB: number;
    percentOfHobbyLimit: number | null;
    warningLevel: "ok" | "watch" | "warn" | "critical";
  };
};

async function pgSize(): Promise<{ size: number; name: string } | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<
      { size: bigint; name: string }[]
    >(
      `SELECT pg_database_size(current_database())::bigint AS size, current_database() AS name`
    );
    if (rows.length === 0) return null;
    return { size: Number(rows[0].size), name: rows[0].name };
  } catch {
    return null;
  }
}

async function sqliteSize(): Promise<number | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<
      { size: number }[]
    >(`SELECT (page_count * page_size) AS size FROM pragma_page_count(), pragma_page_size()`);
    return rows[0]?.size ?? null;
  } catch {
    return null;
  }
}

const HOBBY_POSTGRES_LIMIT_MB = 256;

export async function getSystemStats(): Promise<SystemStats> {
  const retentionDays = Math.max(1, Number(process.env.AUDIT_RETENTION_DAYS ?? 730));

  // Provider detection — safest is to try both queries.
  let provider: SystemStats["provider"] = "unknown";
  let databaseSizeBytes: number | null = null;
  let databaseName: string | null = null;

  const pg = await pgSize();
  if (pg) {
    provider = "postgresql";
    databaseSizeBytes = pg.size;
    databaseName = pg.name;
  } else {
    const sq = await sqliteSize();
    if (sq != null) {
      provider = "sqlite";
      databaseSizeBytes = sq;
    }
  }

  const [
    assets,
    users,
    buildings,
    floors,
    rooms,
    depreciations,
    purchaseLines,
    locationHistory,
    verifications,
    imageCount,
    documentCount,
    auditTotal,
    auditOldest,
  ] = await Promise.all([
    prisma.asset.count(),
    prisma.user.count(),
    prisma.building.count(),
    prisma.floor.count(),
    prisma.room.count(),
    prisma.assetDepreciation.count(),
    prisma.assetPurchaseLine.count(),
    prisma.assetLocationHistory.count(),
    prisma.assetVerification.count(),
    prisma.assetImage.count(),
    prisma.assetDocument.count(),
    prisma.auditLog.count(),
    prisma.auditLog.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
  ]);

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const wouldPruneCount = await prisma.auditLog.count({
    where: { createdAt: { lt: cutoff } },
  });

  const percentOfHobbyLimit =
    provider === "postgresql" && databaseSizeBytes != null
      ? (databaseSizeBytes / (HOBBY_POSTGRES_LIMIT_MB * 1024 * 1024)) * 100
      : null;

  let warningLevel: SystemStats["plan"]["warningLevel"] = "ok";
  if (percentOfHobbyLimit != null) {
    if (percentOfHobbyLimit >= 95) warningLevel = "critical";
    else if (percentOfHobbyLimit >= 80) warningLevel = "warn";
    else if (percentOfHobbyLimit >= 60) warningLevel = "watch";
  }

  return {
    provider,
    databaseSizeBytes,
    databaseName,
    tableCounts: {
      Asset: assets,
      User: users,
      Building: buildings,
      Floor: floors,
      Room: rooms,
      AssetDepreciation: depreciations,
      AssetPurchaseLine: purchaseLines,
      AssetLocationHistory: locationHistory,
      AssetVerification: verifications,
      AuditLog: auditTotal,
    },
    audit: {
      total: auditTotal,
      oldest: auditOldest?.createdAt ?? null,
      retentionDays,
      wouldPruneOlderThan: cutoff,
      wouldPruneCount,
    },
    storage: { imageCount, documentCount },
    plan: {
      hobbyPostgresLimitMB: HOBBY_POSTGRES_LIMIT_MB,
      percentOfHobbyLimit,
      warningLevel,
    },
  };
}

export function formatBytes(n: number | null | undefined) {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
