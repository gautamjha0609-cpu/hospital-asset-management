import ExcelJS from "exceljs";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { assetUrl } from "./env";

export async function exportAssetsToBuffer(where: Prisma.AssetWhereInput = {}) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Asset Detail");
  wb.creator = "Hospital Asset Management";
  wb.created = new Date();

  const columns = [
    { header: "Asset URL", key: "url", width: 42 },
    { header: "Public ID", key: "publicId", width: 24 },
    { header: "Row ID", key: "workbookRowId", width: 8 },
    { header: "FAR No. (Tag)", key: "tagCode", width: 20 },
    { header: "Description", key: "description", width: 60 },
    { header: "Major Category", key: "major", width: 22 },
    { header: "Final Category", key: "final", width: 22 },
    { header: "Sub Category - Ledger", key: "sub", width: 22 },
    { header: "Department", key: "department", width: 16 },
    { header: "Vendor", key: "vendor", width: 30 },
    { header: "Cost Center", key: "costCenter", width: 14 },
    { header: "Plant", key: "plant", width: 6 },
    { header: "Asset Class", key: "assetClass", width: 10 },
    { header: "Cost (Gross Block)", key: "costGrossBlock", width: 16, style: { numFmt: "#,##0.00" } },
    { header: "Net Block", key: "netBlock", width: 16, style: { numFmt: "#,##0.00" } },
    { header: "Voucher Date", key: "voucherDate", width: 12, style: { numFmt: "yyyy-mm-dd" } },
    { header: "Voucher Number", key: "voucherNumber", width: 14 },
    { header: "Capitalized", key: "capitalized", width: 10 },
    { header: "Effective Capitalization Date", key: "effectiveCapitalizationDate", width: 14, style: { numFmt: "yyyy-mm-dd" } },
    { header: "Serial Number", key: "serialNumber", width: 16 },
    { header: "Model", key: "modelNumber", width: 16 },
    { header: "Manufacturer", key: "manufacturer", width: 16 },
    { header: "Barcode", key: "barcode", width: 16 },
    { header: "Warranty Expiry", key: "warrantyExpiry", width: 12, style: { numFmt: "yyyy-mm-dd" } },
    { header: "Status", key: "status", width: 12 },
    { header: "Asset Type", key: "assetType", width: 10 },
    { header: "Tangible / Intangible", key: "tangibility", width: 14 },
    { header: "Building", key: "building", width: 20 },
    { header: "Floor", key: "floor", width: 16 },
    { header: "Room", key: "room", width: 16 },
    { header: "Room Code", key: "roomCode", width: 10 },
    { header: "Map X", key: "mapX", width: 8 },
    { header: "Map Y", key: "mapY", width: 8 },
  ];
  ws.columns = columns;

  // Header style
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { vertical: "middle" };
  ws.getRow(1).height = 20;
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  const BATCH = 500;
  let skip = 0;
  while (true) {
    const rows = await prisma.asset.findMany({
      where,
      orderBy: [{ workbookRowId: "asc" }, { id: "asc" }],
      skip,
      take: BATCH,
      include: {
        majorCategory: { select: { name: true } },
        finalCategory: { select: { name: true } },
        subCategory: { select: { name: true } },
        department: { select: { name: true } },
        vendor: { select: { name: true } },
        costCenter: { select: { code: true } },
        room: { include: { floor: { include: { building: true } } } },
      },
    });
    if (rows.length === 0) break;
    for (const a of rows) {
      const row = ws.addRow({
        url: assetUrl(a.publicId),
        publicId: a.publicId,
        workbookRowId: a.workbookRowId,
        tagCode: a.tagCode,
        description: a.description,
        major: a.majorCategory?.name,
        final: a.finalCategory?.name,
        sub: a.subCategory?.name,
        department: a.department?.name,
        vendor: a.vendor?.name,
        costCenter: a.costCenter?.code,
        plant: a.plantCode,
        assetClass: a.assetClass,
        costGrossBlock: a.costGrossBlock,
        netBlock: a.netBlock,
        voucherDate: a.voucherDate,
        voucherNumber: a.voucherNumber,
        capitalized: a.capitalized ? "Yes" : "No - Still WIP",
        effectiveCapitalizationDate: a.effectiveCapitalizationDate,
        serialNumber: a.serialNumber,
        modelNumber: a.modelNumber,
        manufacturer: a.manufacturer,
        barcode: a.barcode,
        warrantyExpiry: a.warrantyExpiry,
        status: a.status,
        assetType: a.assetType,
        tangibility: a.tangibility,
        building: a.room?.floor.building.name,
        floor: a.room?.floor.name,
        room: a.room?.name,
        roomCode: a.room?.code,
        mapX: a.mapX,
        mapY: a.mapY,
      });
      // Live hyperlink for the URL column
      const cell = row.getCell("url");
      cell.value = { text: assetUrl(a.publicId), hyperlink: assetUrl(a.publicId) } as ExcelJS.CellHyperlinkValue;
      cell.font = { color: { argb: "FF2563EB" }, underline: true };
    }
    skip += rows.length;
    if (rows.length < BATCH) break;
  }

  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
