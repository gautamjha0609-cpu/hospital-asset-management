import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireAdmin();
    const { id } = await params;
    const errs = await prisma.importError.findMany({
      where: { importJobId: id },
      orderBy: { rowNumber: "asc" },
      take: 10000,
    });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Errors");
    ws.columns = [
      { header: "Row", key: "rowNumber", width: 8 },
      { header: "Column", key: "column", width: 24 },
      { header: "Code", key: "code", width: 20 },
      { header: "Message", key: "message", width: 80 },
    ];
    ws.getRow(1).font = { bold: true };
    for (const e of errs) {
      ws.addRow({ rowNumber: e.rowNumber, column: e.column, code: e.code, message: e.message });
    }
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="import-errors-${id}.xlsx"`,
      },
    });
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
