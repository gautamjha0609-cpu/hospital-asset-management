import ExcelJS from "exceljs";
import { prisma } from "./prisma";
import {
  DEFAULT_HEADER_MAP,
  DEPRECIATION_YEARS,
  PO_HEADER_MAP,
  normalizeAssetClass,
  normalizeDepKey,
  normalizePlantCode,
  toBool,
  toDateOrNull,
  toNumberOrNull,
  toTangibility,
} from "./excel-mapping";

export type ImportOptions = {
  jobId: string;
  actorId: string | null;
  dryRun: boolean;
  headerMap?: Record<string, string>;
  batchSize?: number;
};

export type ImportSummary = {
  imported: number;
  updated: number;
  skipped: number;
  duplicates: number;
  errorCount: number;
  totalRows: number;
};

// Read a workbook stream, parse the Asset Detail sheet, upsert every row.
// Location assignments already made in the app for an existing asset are
// preserved (we never blank out roomId/floorId/mapX/mapY on re-import).
export async function importAssetsFromBuffer(
  buf: Buffer,
  opts: ImportOptions
): Promise<ImportSummary> {
  const wb = new ExcelJS.Workbook();
  // ExcelJS types want a Buffer with ArrayBuffer backing; a Node Buffer works
  // fine at runtime, but the TS types are strict — cast through unknown.
  await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);

  const ws =
    wb.getWorksheet("Asset Detail") ??
    wb.getWorksheet("Asset Details") ??
    wb.worksheets[0];
  if (!ws) throw new Error("No worksheet found in workbook.");

  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });

  const map: Record<string, string> = { ...DEFAULT_HEADER_MAP, ...PO_HEADER_MAP, ...(opts.headerMap ?? {}) };

  const summary: ImportSummary = { imported: 0, updated: 0, skipped: 0, duplicates: 0, errorCount: 0, totalRows: 0 };
  const errors: {
    rowNumber: number;
    column?: string;
    code: string;
    message: string;
    rowJson?: string;
  }[] = [];

  // Ensure default ref-data caches
  const majorCache = new Map<string, string>();
  const finalCache = new Map<string, string>();
  const subCache = new Map<string, string>();
  const vendorCache = new Map<string, string>();
  const deptCache = new Map<string, string>();
  const costCenterCache = new Map<string, string>();

  async function getOrCreateMajor(name: string) {
    if (!name) return null;
    const key = name.trim();
    if (!key) return null;
    if (majorCache.has(key)) return majorCache.get(key)!;
    const rec = await prisma.majorCategory.upsert({ where: { name: key }, update: {}, create: { name: key } });
    majorCache.set(key, rec.id);
    return rec.id;
  }
  async function getOrCreateFinal(name: string, majorId: string | null) {
    if (!name) return null;
    const cacheKey = `${majorId ?? ""}::${name}`;
    if (finalCache.has(cacheKey)) return finalCache.get(cacheKey)!;
    const existing = await prisma.finalCategory.findFirst({ where: { name, majorCategoryId: majorId } });
    const rec =
      existing ??
      (await prisma.finalCategory.create({ data: { name, majorCategoryId: majorId } }));
    finalCache.set(cacheKey, rec.id);
    return rec.id;
  }
  async function getOrCreateSub(name: string, finalId: string | null, glCode: number | null, glDesc: string | null, rate: number | null) {
    if (!name) return null;
    const cacheKey = `${finalId ?? ""}::${name}`;
    if (subCache.has(cacheKey)) return subCache.get(cacheKey)!;
    const existing = await prisma.subCategory.findFirst({ where: { name, finalCategoryId: finalId } });
    const rec = existing
      ? await prisma.subCategory.update({
          where: { id: existing.id },
          data: { glCode: glCode ?? existing.glCode, glDescription: glDesc ?? existing.glDescription, depreciationRate: rate ?? existing.depreciationRate },
        })
      : await prisma.subCategory.create({
          data: { name, finalCategoryId: finalId, glCode, glDescription: glDesc, depreciationRate: rate },
        });
    subCache.set(cacheKey, rec.id);
    return rec.id;
  }
  async function getOrCreateVendor(rawName: string) {
    if (!rawName) return null;
    const name = rawName.trim();
    if (!name) return null;
    if (vendorCache.has(name)) return vendorCache.get(name)!;
    const rec = await prisma.vendor.upsert({ where: { name }, update: {}, create: { name } });
    vendorCache.set(name, rec.id);
    return rec.id;
  }
  async function getOrCreateDept(name: string) {
    if (!name) return null;
    if (deptCache.has(name)) return deptCache.get(name)!;
    const rec = await prisma.department.upsert({ where: { name }, update: {}, create: { name } });
    deptCache.set(name, rec.id);
    return rec.id;
  }
  async function getOrCreateCostCenter(code: string) {
    if (!code) return null;
    if (costCenterCache.has(code)) return costCenterCache.get(code)!;
    const rec = await prisma.costCenter.upsert({ where: { code }, update: {}, create: { code } });
    costCenterCache.set(code, rec.id);
    return rec.id;
  }

  const totalRows = ws.actualRowCount - 1; // exclude header
  summary.totalRows = Math.max(0, totalRows);

  const batch = opts.batchSize ?? 250;
  let bufferRows: { rowNumber: number; values: unknown[] }[] = [];

  async function flush() {
    for (const { rowNumber, values } of bufferRows) {
      try {
        const rec: Record<string, unknown> = {};
        for (let i = 0; i < headers.length; i++) {
          rec[headers[i]] = values[i];
        }

        const description = String(rec["Description"] ?? "").trim();
        if (!description) {
          summary.skipped += 1;
          errors.push({ rowNumber, column: "Description", code: "MISSING_REQUIRED", message: "Description is required." });
          continue;
        }

        const workbookRowId = toNumberOrNull(rec["Row ID"]);
        const tagCode = rec["FAR No. (Tag)"] ? String(rec["FAR No. (Tag)"]).trim() : null;

        // Reference data
        const majorId = await getOrCreateMajor(String(rec["Major Category"] ?? "").trim());
        const finalId = await getOrCreateFinal(String(rec["Final Category"] ?? "").trim(), majorId);
        const subId = await getOrCreateSub(
          String(rec["Sub Category - Ledger"] ?? "").trim(),
          finalId,
          toNumberOrNull(rec["GL Code"]),
          rec["GL Description"] ? String(rec["GL Description"]) : null,
          toNumberOrNull(rec["Depreciation Rate (WDV)"])
        );
        const vendorId = await getOrCreateVendor(String(rec["Vendor"] ?? ""));
        const deptId = await getOrCreateDept(String(rec["Outsource: Dept"] ?? "").trim());
        const costCenterId = await getOrCreateCostCenter(String(rec["Cost Center"] ?? "").trim());

        const capitalized = toBool(rec["Capitalized"]) ?? true;
        const costGross = toNumberOrNull(rec["Cost (Gross Block)"]) ?? 0;
        const netBlock = toNumberOrNull(rec["Net Block (WDV) as at 31.03.2025"]);
        const tangibility = toTangibility(rec["Tangible / Intangible"]);

        // Prefer the PO's cleaner "Item Description" as the human-facing
        // asset name when it exists; the workbook's own `Description`
        // column stays as the long-form description.
        const poItem = rec["PO: Item Description"];
        const name =
          poItem && String(poItem).trim() ? String(poItem).trim() : null;

        const upsertData = {
          workbookRowId: workbookRowId ?? undefined,
          tagCode,
          name,
          description,
          assetClass: normalizeAssetClass(rec["Asset Class"]),
          plantCode: normalizePlantCode(rec["Plant"]),
          depreciationKey: normalizeDepKey(rec["Dep Key"]),
          voucherDate: toDateOrNull(rec["Voucher Date"]),
          voucherNumber: rec["Voucher Number"] ? String(rec["Voucher Number"]) : null,
          effectiveCapitalizationDate: toDateOrNull(rec["Effective Capitalization Date"]),
          costGrossBlock: costGross,
          netBlock,
          capitalized,
          tangibility,
          outsourceFarCode: rec["Outsource: FAR Code"] ? String(rec["Outsource: FAR Code"]).trim() : null,
          glCode: toNumberOrNull(rec["GL Code"]),
          majorCategoryId: majorId,
          finalCategoryId: finalId,
          subCategoryId: subId,
          vendorId,
          departmentId: deptId,
          costCenterId,
        };

        let asset;
        if (opts.dryRun) {
          summary.imported += 1; // treat as would-import in dry run
          continue;
        }

        if (workbookRowId != null) {
          const existing = await prisma.asset.findUnique({ where: { workbookRowId } });
          if (existing) {
            asset = await prisma.asset.update({
              where: { id: existing.id },
              // NOTE: we do NOT overwrite roomId/floorId/mapX/mapY — location
              // work done in the app is preserved on re-import.
              data: upsertData,
            });
            summary.updated += 1;
          } else {
            asset = await prisma.asset.create({ data: upsertData });
            summary.imported += 1;
          }
        } else if (tagCode) {
          const existing = await prisma.asset.findUnique({ where: { tagCode } });
          if (existing) {
            asset = await prisma.asset.update({ where: { id: existing.id }, data: upsertData });
            summary.updated += 1;
          } else {
            asset = await prisma.asset.create({ data: upsertData });
            summary.imported += 1;
          }
        } else {
          // No stable id — treat as new but flag as duplicate risk.
          asset = await prisma.asset.create({ data: upsertData });
          summary.imported += 1;
          summary.duplicates += 1;
        }

        // Import metadata (preserves the workbook's own data-quality columns)
        await prisma.assetImportMeta.upsert({
          where: { assetId: asset.id },
          update: {
            assetClassSource: rec["Asset Class Source"] ? String(rec["Asset Class Source"]) : null,
            outsourceStatus: rec["Outsource: Status"] ? String(rec["Outsource: Status"]) : null,
            outsourceRemarks: rec["Outsource: Remarks"] ? String(rec["Outsource: Remarks"]) : null,
            rbhResolution: rec["RBH-Intern: Resolution"] ? String(rec["RBH-Intern: Resolution"]) : null,
            rbhConfidence: rec["RBH-Intern: Confidence"] ? String(rec["RBH-Intern: Confidence"]) : null,
            rbhNote: rec["RBH-Intern: Note"] ? String(rec["RBH-Intern: Note"]) : null,
            importJobId: opts.jobId,
          },
          create: {
            assetId: asset.id,
            assetClassSource: rec["Asset Class Source"] ? String(rec["Asset Class Source"]) : null,
            outsourceStatus: rec["Outsource: Status"] ? String(rec["Outsource: Status"]) : null,
            outsourceRemarks: rec["Outsource: Remarks"] ? String(rec["Outsource: Remarks"]) : null,
            rbhResolution: rec["RBH-Intern: Resolution"] ? String(rec["RBH-Intern: Resolution"]) : null,
            rbhConfidence: rec["RBH-Intern: Confidence"] ? String(rec["RBH-Intern: Confidence"]) : null,
            rbhNote: rec["RBH-Intern: Note"] ? String(rec["RBH-Intern: Note"]) : null,
            importJobId: opts.jobId,
          },
        });

        // Purchase-line
        const anyPo = Object.keys(PO_HEADER_MAP).some((h) => rec[h] != null && rec[h] !== "");
        if (anyPo) {
          const poData = {
            poLineUid: rec["PO: PO Line UID"] ? String(rec["PO: PO Line UID"]) : null,
            poFinancialYear: rec["PO: Financial Year"] ? String(rec["PO: Financial Year"]) : null,
            poNumber: rec["PO: PO No"] ? String(rec["PO: PO No"]) : null,
            poDate: toDateOrNull(rec["PO: PO Date"]),
            poVendorCode: rec["PO: Vendor Code"] ? String(rec["PO: Vendor Code"]) : null,
            poVendorName: rec["PO: Vendor Name"] ? String(rec["PO: Vendor Name"]) : null,
            poDocumentType: rec["PO: Document Type"] ? String(rec["PO: Document Type"]) : null,
            poSourceFile: rec["PO: Source File"] ? String(rec["PO: Source File"]) : null,
            poSlNo: toNumberOrNull(rec["PO: SL No"]),
            poItemDescription: rec["PO: Item Description"] ? String(rec["PO: Item Description"]) : null,
            poHsn: toNumberOrNull(rec["PO: HSN"]),
            poUnit: rec["PO: Unit"] ? String(rec["PO: Unit"]) : null,
            poQty: toNumberOrNull(rec["PO: Qty"]),
            poFreeQty: toNumberOrNull(rec["PO: Free Qty"]),
            poBaseRate: toNumberOrNull(rec["PO: Base Rate"]),
            poDiscPct: toNumberOrNull(rec["PO: Disc (%)"]),
            poDiscAmt: toNumberOrNull(rec["PO: Disc (Amt)"]),
            poCgstRate: toNumberOrNull(rec["PO: CGST Rate"]),
            poCgstAmt: toNumberOrNull(rec["PO: CGST Amt"]),
            poSgstRate: toNumberOrNull(rec["PO: SGST/UTGST Rate"]),
            poSgstAmt: toNumberOrNull(rec["PO: SGST/UTGST Amt"]),
            poIgstRate: toNumberOrNull(rec["PO: IGST Rate"]),
            poIgstAmt: toNumberOrNull(rec["PO: IGST Amt"]),
            poDeliveryCharges: toNumberOrNull(rec["PO: Delivery/Packing/Oth. Charges"]),
            poLabourCess: toNumberOrNull(rec["PO: Labour Cess"]),
            poNetUnitPrice: toNumberOrNull(rec["PO: Net Pur Unit Price"]),
            poTotalAmount: toNumberOrNull(rec["PO: Total Amount"]),
            poWorkOrderRegNo: rec["PO: M.Reg No (Work Order)"] ? String(rec["PO: M.Reg No (Work Order)"]) : null,
            poLineFingerprint: rec["PO: Line Fingerprint"] ? String(rec["PO: Line Fingerprint"]) : null,
            poIdenticalLineGroup: toNumberOrNull(rec["PO: Identical-Line Group"]),
            poOccurrenceInGroup: toNumberOrNull(rec["PO: Occurrence In Group"]),
            poMatchBasis: rec["PO: Match Basis"] ? String(rec["PO: Match Basis"]) : null,
            poMatchConfidence: rec["PO: Match Confidence"] ? String(rec["PO: Match Confidence"]) : null,
            poMatchScore: rec["PO: Match Score"] != null ? String(rec["PO: Match Score"]) : null,
            poMatchNote: rec["PO: Match Note"] ? String(rec["PO: Match Note"]) : null,
            poPdfFound: toBool(rec["PO: PDF Found"]),
          };
          await prisma.assetPurchaseLine.upsert({
            where: { assetId: asset.id },
            update: poData,
            create: { assetId: asset.id, ...poData },
          });
        }

        // Depreciations
        for (const dep of DEPRECIATION_YEARS) {
          const depAmount = toNumberOrNull(rec[dep.dep]);
          if (depAmount == null) continue;
          const accum = toNumberOrNull(rec[dep.accum]) ?? 0;
          const cap = toDateOrNull(rec[dep.capDate]);
          const days = dep.daysDep ? toNumberOrNull(rec[dep.daysDep]) : null;
          await prisma.assetDepreciation.upsert({
            where: { assetId_fiscalYear: { assetId: asset.id, fiscalYear: dep.year } },
            update: { depAmount, accumUpto: accum, capDate: cap, daysDep: days ?? undefined },
            create: {
              assetId: asset.id,
              fiscalYear: dep.year,
              depAmount,
              accumUpto: accum,
              capDate: cap,
              daysDep: days ?? undefined,
            },
          });
        }
      } catch (err) {
        summary.errorCount += 1;
        errors.push({
          rowNumber,
          code: "IMPORT_ERROR",
          message: (err as Error).message.slice(0, 500),
        });
      }
    }
    bufferRows = [];
  }

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const values: unknown[] = [];
    for (let i = 1; i <= headers.length; i++) {
      const cell = row.getCell(i);
      values.push(cell?.value ?? null);
    }
    bufferRows.push({ rowNumber, values });
  });

  // Flush in batches
  const all = bufferRows.slice();
  bufferRows = [];
  for (let i = 0; i < all.length; i += batch) {
    bufferRows = all.slice(i, i + batch);
    await flush();
  }

  // Persist errors
  if (errors.length && !opts.dryRun) {
    for (let i = 0; i < errors.length; i += 200) {
      await prisma.importError.createMany({
        data: errors.slice(i, i + 200).map((e) => ({
          importJobId: opts.jobId,
          rowNumber: e.rowNumber,
          column: e.column,
          code: e.code,
          message: e.message,
          rowJson: e.rowJson,
        })),
      });
    }
  }

  return summary;
}
