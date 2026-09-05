import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin } from "@/lib/auth";
import { importAssetsFromBuffer } from "@/lib/excel-import";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const form = await req.formData();
    const file = form.get("file");
    const dryRunRaw = form.get("dryRun");
    const dryRun = String(dryRunRaw ?? "false") === "true";
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    const filename = (file as File).name ?? "workbook.xlsx";
    const bytes = Buffer.from(await file.arrayBuffer());
    const job = await prisma.importJob.create({
      data: {
        actorId: admin.id,
        filename,
        sheetName: "Asset Detail",
        status: dryRun ? "VALIDATING" : "IMPORTING",
      },
    });

    let summary;
    try {
      summary = await importAssetsFromBuffer(bytes, {
        jobId: job.id,
        actorId: admin.id,
        dryRun,
      });
    } catch (err) {
      await prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          summaryJson: JSON.stringify({ error: (err as Error).message }),
        },
      });
      throw err;
    }

    const done = await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: dryRun ? "READY" : "COMPLETED",
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

    await audit({
      actorId: admin.id,
      action: "IMPORT",
      entity: "import_job",
      entityId: job.id,
      after: { ...summary, dryRun, filename },
    });

    return NextResponse.json({ job: done, summary });
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: (e as Error).message ?? "Import failed." }, { status: 500 });
  }
}
