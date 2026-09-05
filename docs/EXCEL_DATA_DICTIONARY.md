# Excel Data Dictionary — `Asset Detail` sheet

Source workbook: `Output_1__FA_Schedule_All_Years.xlsx`
Sheet: **`Asset Detail`** (singular; the mandate said "Asset Details" — the
actual sheet name in the file is `Asset Detail`).
Rows: **19,406** asset lines (excluding header). Columns: **93**.

## Legend

- **fill** — percentage of the 19,406 rows where the column is non-empty.
- **types** — Python types seen in the column body.
- **uniques** — number of distinct non-null values, capped at 500 for the
  profiler (so "500" means "≥500", not "exactly 500").
- **maps to** — the target column, table, or workflow in the app schema.
- Enum-like columns list their full observed value set.

## Core identification

| # | Column | fill | types | uniques | maps to |
|---|---|---|---|---|---|
| 0 | `S.No` | 100% | int | ≥500 | ignored (running counter) |
| 1 | `Row ID` | 100% | int | ≥500 | `Asset.workbookRowId` (preserved for round-trip) |
| 2 | `FAR No. (Tag)` | 30% | str | ≥500 | `Asset.tagCode` (physical tag; **optional**) |
| 3 | `Asset Class` | 95% | str/int | 30 | `Asset.assetClass` (raw); normalized via lookup — Z002…Z023 codes (case is inconsistent — `Z005` vs `z005` — normalize on import) |
| 4 | `Asset Class Source` | 100% | str | 3 | `AssetImportMeta.assetClassSource` — one of `Source`, `Inferred from head (not in FA-MASTER-TEMPLATE)`, `Missing -- not in source, head not confidently inferable` |
| 5 | `Description` | 98% | str | ≥500 | `Asset.description` (primary display name) |

## Ownership / operational context

| # | Column | fill | types | uniques | maps to |
|---|---|---|---|---|---|
| 6 | `Cost Center` | 83% | str | 23 | `Asset.costCenterCode` → `CostCenter` table |
| 7 | `Plant` | 76% | str | 2 | `Asset.plantCode` (normalize `rb01`→`RB01`) |
| 8 | `Vendor` | 83% | str | ≥500 | `Asset.vendorId` → `Vendor` (dedupe by trimmed name; keep original spelling in `Vendor.aliases`) |
| 9 | `Dep Key` | 90% | str | 8 | `Asset.depreciationKey` (normalize case; treat `#N/A`, `NA` as null) |
| 50 | `Outsource: Dept` | 70% | str | 5 | `Asset.departmentId` → `Department` (Biomedical / Engineering / F&F / IT / Security) |
| 51 | `Outsource: FAR Code` | 30% | str | ≥500 | `Asset.outsourceFarCode` — the dept's own tag code (may differ from `FAR No. (Tag)`) |
| 52 | `Outsource: Status` | 70% | str | 14 | `AssetImportMeta.outsourceStatus` (BME / IT / P&M / Mapped / Tagged / Tagged Asset / Untaggable / Not Found / Condemnation Sheet / etc.) |
| 53 | `Outsource: Remarks` | 28% | str | 166 | `AssetImportMeta.outsourceRemarks` |

## Voucher / procurement (main)

| # | Column | fill | types | uniques | maps to |
|---|---|---|---|---|---|
| 10 | `Voucher Date` | 100% | datetime | ≥500 | `Asset.voucherDate` |
| 11 | `Voucher Number` | 100% | str | ≥500 | `Asset.voucherNumber` |
| 12 | `Cost (Gross Block)` | 100% | int/float | ≥500 | `Asset.costGrossBlock` (money, stored as `Decimal(18,4)`) |
| 13 | `Capitalized` | 100% | str | 2 | `Asset.capitalized` (bool; `Yes` / `No - Still WIP`) |
| 14 | `Effective Capitalization Date` | 93% | datetime | ≥500 | `Asset.effectiveCapitalizationDate` |

## Accounting category (hierarchical)

| # | Column | fill | types | uniques | maps to |
|---|---|---|---|---|---|
| 15 | `Major Category` | 100% | str | 6 | `Asset.majorCategoryId` → `MajorCategory` (Capital Work in Progress / Furniture & Fixture / IT Hardware & software / Land & Building / Office Equipment / Plant & Machinery) |
| 16 | `Final Category` | 100% | str | 9 | `Asset.finalCategoryId` → `FinalCategory` (A C Plant/Air Plant / Building / CWIP / Electric Generator / Electrical Installation / Hospital Equipment / Office Furniture / Others / Software) |
| 17 | `Sub Category - Ledger` | 100% | str | 20 | `Asset.subCategoryId` → `SubCategory` (Air Conditioning System, Building, Computer & Printer, DG Set, Fire Fighting Equipments, Furniture & Fixture, Kitchen Equipment, Medical Equipment, Medical Furniture, Medical Gas System, Office Equipment, Software, Telephone Instrument, Vehicle - Others, …) |
| 18 | `GL Code` | 93% | int | 15 | `Asset.glCode` |
| 19 | `GL Description` | 100% | str | 17 | `SubCategory.glDescription` (derived, not on Asset) |
| 20 | `Depreciation Rate (WDV)` | 93% | float | 3 | `SubCategory.depreciationRate` (0.05 / 0.10 / 0.40) |

## Depreciation history (per fiscal year)

Columns 21–48 encode 8 fiscal years (FY2017-18 … FY2024-25) in a wide layout:

- `Cap. Date for FYxxxx-yy` — the capitalization date used for the FY calc
- `Days Dep FYxxxx-yy` — days depreciation was applied (0 / 1 / 365)
- `Depreciation FYxxxx-yy (Source)` or `Depreciation FYxxxx-yy` — the amount
- `Accum upto 31.03.yyyy` — accumulated depreciation as of the FY-end
- `Net Block (WDV) as at 31.03.2025` — the closing balance (col 48)

**Maps to** `AssetDepreciation(assetId, fiscalYear)` with columns
`capDate`, `daysDep`, `depAmount`, `accumUpto`. This normalizes the wide
layout so a new fiscal year does not require a schema change.

## Tangibility

| # | Column | fill | types | uniques | maps to |
|---|---|---|---|---|---|
| 49 | `Tangible / Intangible` | 100% | str | 2 | `Asset.tangibility` enum |

## Data-quality metadata (from source workbook)

Preserved in `AssetImportMeta` so the audit trail from the source workbook
is not lost; not surfaced in the primary asset UI.

| # | Column | fill | uniques | maps to |
|---|---|---|---|---|
| 54 | `RBH-Intern: Resolution` | 100% | 5 | `.rbhResolution` (Matched / Resolved / Not resolved from available data / Not independently investigated / Never referenced by any outsource dept sheet) |
| 55 | `RBH-Intern: Confidence` | 7% | 6 | `.rbhConfidence` (`-`, `50%`, `67%`, `71%`, `75%`, `100%`) |
| 56 | `RBH-Intern: Note` | 7% | ≥500 | `.rbhNote` |

## Purchase-order line (optional, ~40% of assets)

Modeled as `AssetPurchaseLine` — one-to-one with an asset when present.
`Match Confidence` values: `Header only`, `High`, `Low - review`,
`Medium`, `PDF not supplied`.

| # | Column | uniques | maps to |
|---|---|---|---|
| 57 | `PO: PO Line UID` | ≥500 | `.poLineUid` |
| 58 | `PO: Financial Year` | 6 (2019-20…2024-25) | `.poFinancialYear` |
| 59 | `PO: PO No` | ≥500 | `.poNumber` |
| 60 | `PO: PO Date` | ≥500 | `.poDate` |
| 61 | `PO: Vendor Code` | 328 | `.poVendorCode` |
| 62 | `PO: Vendor Name` | 316 | `.poVendorName` |
| 63 | `PO: Document Type` | 2 (ASSET PURCHASE ORDER / WORK ORDER) | `.poDocumentType` |
| 64 | `PO: Source File` | ≥500 | `.poSourceFile` |
| 65 | `PO: SL No` | 300 | `.poSlNo` |
| 66 | `PO: Item Description` | ≥500 | `.poItemDescription` |
| 67 | `PO: HSN` | 24 | `.poHsn` |
| 68 | `PO: Unit` | 21 (NOS/EA/BOX/PC/M/M2/…) | `.poUnit` |
| 69 | `PO: Qty` | 116 | `.poQty` |
| 70 | `PO: Free Qty` | 1 | `.poFreeQty` |
| 71 | `PO: Base Rate` | ≥500 | `.poBaseRate` |
| 72 | `PO: Disc (%)` | 4 | `.poDiscPct` |
| 73 | `PO: Disc (Amt)` | 11 | `.poDiscAmt` |
| 74 | `PO: CGST Rate` | 5 | `.poCgstRate` |
| 75 | `PO: CGST Amt` | ≥500 | `.poCgstAmt` |
| 76 | `PO: SGST/UTGST Rate` | 5 | `.poSgstRate` |
| 77 | `PO: SGST/UTGST Amt` | ≥500 | `.poSgstAmt` |
| 78 | `PO: IGST Rate` | 6 (0/5/6/12/18/28) | `.poIgstRate` |
| 79 | `PO: IGST Amt` | ≥500 | `.poIgstAmt` |
| 80 | `PO: Delivery/Packing/Oth. Charges` | 46 | `.poDeliveryCharges` |
| 81 | `PO: Labour Cess` | 1 | `.poLabourCess` |
| 82 | `PO: Net Pur Unit Price` | ≥500 | `.poNetUnitPrice` |
| 83 | `PO: Total Amount` | ≥500 | `.poTotalAmount` |
| 84 | `PO: M.Reg No (Work Order)` | 1 | `.poWorkOrderRegNo` |
| 85 | `PO: Line Fingerprint` | ≥500 | `.poLineFingerprint` (import de-dup key) |
| 86 | `PO: Identical-Line Group` | 38 | `.poIdenticalLineGroup` |
| 87 | `PO: Occurrence In Group` | 300 | `.poOccurrenceInGroup` |
| 88 | `PO: Match Basis` | 27 | `.poMatchBasis` |
| 89 | `PO: Match Confidence` | 5 | `.poMatchConfidence` |
| 90 | `PO: Match Score` | ≥500 | `.poMatchScore` |
| 91 | `PO: Match Note` | ≥500 | `.poMatchNote` |
| 92 | `PO: PDF Found` | 2 (Yes / No) | `.poPdfFound` |

## Data-quality observations that shape the schema

1. `Row ID` is a stable per-row identifier from the workbook and is preserved
   as `Asset.workbookRowId` so a re-import updates instead of duplicating.
2. `FAR No. (Tag)` is only 30% populated — the schema must allow assets
   *without* a tag (bulk consumables, un-taggable items).
3. Case is inconsistent in `Asset Class`, `Plant`, and `Dep Key` (`Z005`
   vs `z005`, `RB01` vs `rb01`, `CKB6` vs `ckb6`). The import layer uppercases
   these before lookup.
4. `#N/A` and `NA` appear in several columns as strings — treat as null on
   import; log to `ImportError` when the target column is required.
5. The workbook contains **no room-, floor-, or building-level location**.
   Location assignment is a task performed inside the app after import; the
   Excel round-trip preserves that assignment as an additional column
   (`Building / Floor / Room`), and the import respects the assignment on a
   re-import so admin location work is never lost.
6. Purchase-order fields are ~40% populated. Modeled as a nullable one-to-one
   `AssetPurchaseLine` so `Asset` rows are not bloated for the 60% that lack
   PO data.
7. Depreciation is per-fiscal-year — modeled as a normalized side table so
   FY2025-26 can be added by inserting rows, not adding columns.
