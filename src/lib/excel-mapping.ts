// Mapping from the workbook column headers to internal Asset fields.
// Users can override any mapping from the admin import UI; this file is the
// default used when a header matches exactly (case-insensitive, trimmed).

export const DEFAULT_HEADER_MAP: Record<string, string> = {
  "Row ID": "workbookRowId",
  "FAR No. (Tag)": "tagCode",
  "Asset Class": "assetClass",
  "Description": "description",
  "Cost Center": "__costCenterCode",
  "Plant": "plantCode",
  "Vendor": "__vendorName",
  "Dep Key": "depreciationKey",
  "Voucher Date": "voucherDate",
  "Voucher Number": "voucherNumber",
  "Cost (Gross Block)": "costGrossBlock",
  "Capitalized": "__capitalized",
  "Effective Capitalization Date": "effectiveCapitalizationDate",
  "Major Category": "__majorCategoryName",
  "Final Category": "__finalCategoryName",
  "Sub Category - Ledger": "__subCategoryName",
  "GL Code": "glCode",
  "GL Description": "__glDescription",
  "Depreciation Rate (WDV)": "__depreciationRate",
  "Net Block (WDV) as at 31.03.2025": "netBlock",
  "Tangible / Intangible": "__tangibility",
  "Outsource: Dept": "__departmentName",
  "Outsource: FAR Code": "outsourceFarCode",
  "Outsource: Status": "__outsourceStatus",
  "Outsource: Remarks": "__outsourceRemarks",
  "RBH-Intern: Resolution": "__rbhResolution",
  "RBH-Intern: Confidence": "__rbhConfidence",
  "RBH-Intern: Note": "__rbhNote",
  "Asset Class Source": "__assetClassSource",
  // Location added by our own export (round-trip)
  "Building": "__buildingName",
  "Floor": "__floorName",
  "Room": "__roomName",
  "Asset URL": "__ignore",
};

export const PO_HEADER_MAP: Record<string, string> = {
  "PO: PO Line UID": "poLineUid",
  "PO: Financial Year": "poFinancialYear",
  "PO: PO No": "poNumber",
  "PO: PO Date": "poDate",
  "PO: Vendor Code": "poVendorCode",
  "PO: Vendor Name": "poVendorName",
  "PO: Document Type": "poDocumentType",
  "PO: Source File": "poSourceFile",
  "PO: SL No": "poSlNo",
  "PO: Item Description": "poItemDescription",
  "PO: HSN": "poHsn",
  "PO: Unit": "poUnit",
  "PO: Qty": "poQty",
  "PO: Free Qty": "poFreeQty",
  "PO: Base Rate": "poBaseRate",
  "PO: Disc (%)": "poDiscPct",
  "PO: Disc (Amt)": "poDiscAmt",
  "PO: CGST Rate": "poCgstRate",
  "PO: CGST Amt": "poCgstAmt",
  "PO: SGST/UTGST Rate": "poSgstRate",
  "PO: SGST/UTGST Amt": "poSgstAmt",
  "PO: IGST Rate": "poIgstRate",
  "PO: IGST Amt": "poIgstAmt",
  "PO: Delivery/Packing/Oth. Charges": "poDeliveryCharges",
  "PO: Labour Cess": "poLabourCess",
  "PO: Net Pur Unit Price": "poNetUnitPrice",
  "PO: Total Amount": "poTotalAmount",
  "PO: M.Reg No (Work Order)": "poWorkOrderRegNo",
  "PO: Line Fingerprint": "poLineFingerprint",
  "PO: Identical-Line Group": "poIdenticalLineGroup",
  "PO: Occurrence In Group": "poOccurrenceInGroup",
  "PO: Match Basis": "poMatchBasis",
  "PO: Match Confidence": "poMatchConfidence",
  "PO: Match Score": "poMatchScore",
  "PO: Match Note": "poMatchNote",
  "PO: PDF Found": "poPdfFound",
};

// Column headers whose data belongs to AssetDepreciation rows. Structured
// as {year: {capDateCol, daysDepCol, depCol, accumCol}} so we can pivot
// the wide layout into normalized rows on import.
export const DEPRECIATION_YEARS: Array<{
  year: string;
  capDate: string;
  daysDep?: string;
  dep: string;
  accum: string;
}> = [
  { year: "2017-18", capDate: "Cap. Date for FY2017-18", dep: "Depreciation FY2017-18 (Source)", accum: "Accum upto 31.03.2018" },
  { year: "2018-19", capDate: "Cap. Date for FY2018-19", dep: "Depreciation FY2018-19 (Source)", accum: "Accum upto 31.03.2019" },
  { year: "2019-20", capDate: "Cap. Date for FY2019-20", dep: "Depreciation FY2019-20 (Source)", accum: "Accum upto 31.03.2020" },
  { year: "2020-21", capDate: "Cap. Date for FY2020-21", dep: "Depreciation FY2020-21 (Source)", accum: "Accum upto 31.03.2021" },
  { year: "2021-22", capDate: "Cap. Date for FY2021-22", dep: "Depreciation FY2021-22 (Source)", accum: "Accum upto 31.03.2022" },
  { year: "2022-23", capDate: "Cap. Date for FY2022-23", daysDep: "Days Dep FY2022-23", dep: "Depreciation FY2022-23", accum: "Accum upto 31.03.2023" },
  { year: "2023-24", capDate: "Cap. Date for FY2023-24", daysDep: "Days Dep FY2023-24", dep: "Depreciation FY2023-24", accum: "Accum upto 31.03.2024" },
  { year: "2024-25", capDate: "Cap. Date for FY2024-25", daysDep: "Days Dep FY2024-25", dep: "Depreciation FY2024-25", accum: "Accum upto 31.03.2025" },
];

export function normalizePlantCode(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim().toUpperCase();
  return s ? s : null;
}
export function normalizeAssetClass(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "#N/A") return null;
  return s.toUpperCase();
}
export function normalizeDepKey(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "#N/A" || s.toUpperCase() === "NA") return null;
  return s.toUpperCase();
}
export function toBool(v: unknown): boolean | null {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (["yes", "true", "1", "y"].includes(s)) return true;
  if (["no", "no - still wip", "false", "0", "n"].includes(s)) return false;
  return null;
}
export function toNumberOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
export function toDateOrNull(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v : null;
  const d = new Date(v as string);
  return Number.isFinite(d.getTime()) ? d : null;
}
export function toTangibility(v: unknown): "TANGIBLE" | "INTANGIBLE" | null {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "tangible") return "TANGIBLE";
  if (s === "intangible") return "INTANGIBLE";
  return null;
}
