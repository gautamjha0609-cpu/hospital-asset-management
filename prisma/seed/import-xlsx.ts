// Optional: bulk-import a real .xlsx file from the CLI.
// Usage:  XLSX_PATH=/path/to/workbook.xlsx npm run seed:xlsx
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { importAssetsFromBuffer } from "../../src/lib/excel-import";

const prisma = new PrismaClient();

async function main() {
  const path = process.env.XLSX_PATH;
  if (!path) {
    console.error("Set XLSX_PATH=/absolute/path/to/workbook.xlsx");
    process.exit(1);
  }
  const buf = await readFile(path);
  const job = await prisma.importJob.create({
    data: { filename: path.split("/").pop() ?? "workbook.xlsx", sheetName: "Asset Detail", status: "IMPORTING" },
  });
  console.log("Starting import…");
  const summary = await importAssetsFromBuffer(buf, { jobId: job.id, actorId: null, dryRun: false });
  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: "COMPLETED",
      finishedAt: new Date(),
      totalRows: summary.totalRows,
      imported: summary.imported,
      updated: summary.updated,
      skipped: summary.skipped,
      duplicates: summary.duplicates,
      errorCount: summary.errorCount,
      summaryJson: JSON.stringify(summary),
    },
  });
  console.log("Done:", summary);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
