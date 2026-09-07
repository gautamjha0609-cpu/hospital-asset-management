-- ================================================================
-- Power BI reporting layer for RBH Assets
-- ================================================================
-- Run this against your Postgres AFTER the app is deployed and the
-- workbook has been imported. It creates:
--   1. A read-only Postgres role for Power BI to connect with.
--   2. A dedicated schema `reporting` that holds the views.
--   3. Denormalized views optimized for Power BI's data model.
--
-- Power BI connects with the reporting_reader user and sees ONLY the
-- views in the `reporting` schema — never the raw tables and never
-- write access. Rotating the reporting_reader password does not
-- affect the operational app.
--
-- Usage from psql:
--   \i prisma/reporting.sql
--   -- then:  ALTER USER reporting_reader WITH PASSWORD 'a-strong-password';
--   -- give that user + password to your Power BI team.
-- ================================================================

BEGIN;

-- ---------- Role for Power BI --------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'reporting_reader') THEN
    CREATE ROLE reporting_reader
      WITH LOGIN
      PASSWORD 'CHANGE-ME-immediately-after-creation'
      CONNECTION LIMIT 5;
  END IF;
END $$;

-- ---------- Schema --------------------------------------------------
CREATE SCHEMA IF NOT EXISTS reporting;
GRANT USAGE ON SCHEMA reporting TO reporting_reader;

-- ---------- v_asset_full --------------------------------------------
-- One row per asset, everything denormalized. This is the primary
-- fact table for Power BI. All other views are aggregations off it.
CREATE OR REPLACE VIEW reporting.v_asset_full AS
SELECT
  a.id                            AS asset_id,
  a."publicId"                    AS public_id,
  a."workbookRowId"               AS workbook_row_id,
  a."tagCode"                     AS tag_code,
  a."outsourceFarCode"            AS outsource_far_code,
  a.name                          AS asset_name,
  a.description                   AS description,
  a."assetType"                   AS asset_type,     -- MOVABLE / IMMOVABLE
  a.status                        AS status,        -- ACTIVE / LOST / CONDEMNED / UNDER_REPAIR / WIP / INACTIVE
  a.condition                     AS condition,
  a."assetClass"                  AS asset_class,
  a.tangibility                   AS tangibility,
  a.capitalized                   AS capitalized,

  a."costGrossBlock"              AS cost_gross_block,
  a."netBlock"                    AS net_block,
  a."voucherDate"                 AS voucher_date,
  a."voucherNumber"               AS voucher_number,
  a."effectiveCapitalizationDate" AS effective_cap_date,
  EXTRACT(YEAR FROM a."voucherDate")::int AS voucher_year,

  a."serialNumber"                AS serial_number,
  a."modelNumber"                 AS model_number,
  a.manufacturer                  AS manufacturer,
  a.barcode                       AS barcode,
  a."warrantyExpiry"              AS warranty_expiry,

  mc.name                         AS major_category,
  fc.name                         AS final_category,
  sc.name                         AS sub_category,
  sc."glCode"                     AS gl_code,

  v.name                          AS vendor,
  d.name                          AS department,
  cc.code                         AS cost_center,
  a."plantCode"                   AS plant_code,

  b.name                          AS building,
  f.name                          AS floor,
  f."floorNumber"                 AS floor_number,
  r.name                          AS room,
  r.code                          AS room_code,
  r.type                          AS room_type,

  a."lastVerifiedAt"              AS last_verified_at,
  CASE
    WHEN a."lastVerifiedAt" IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM NOW() - a."lastVerifiedAt")::int
  END                             AS days_since_verified,

  a."createdAt"                   AS created_at,
  a."updatedAt"                   AS updated_at
FROM "Asset" a
LEFT JOIN "MajorCategory"  mc ON mc.id = a."majorCategoryId"
LEFT JOIN "FinalCategory"  fc ON fc.id = a."finalCategoryId"
LEFT JOIN "SubCategory"    sc ON sc.id = a."subCategoryId"
LEFT JOIN "Vendor"         v  ON v.id  = a."vendorId"
LEFT JOIN "Department"     d  ON d.id  = a."departmentId"
LEFT JOIN "CostCenter"     cc ON cc.id = a."costCenterId"
LEFT JOIN "Floor"          f  ON f.id  = a."floorId"
LEFT JOIN "Room"           r  ON r.id  = a."roomId"
LEFT JOIN "Building"       b  ON b.id  = f."buildingId";

COMMENT ON VIEW reporting.v_asset_full IS
  'Denormalized single-row-per-asset view. Primary fact table for Power BI.';

-- ---------- v_asset_by_department -----------------------------------
CREATE OR REPLACE VIEW reporting.v_asset_by_department AS
SELECT
  COALESCE(department, 'Unassigned')            AS department,
  COUNT(*)                                       AS asset_count,
  SUM(cost_gross_block)                          AS gross_block,
  SUM(net_block)                                 AS net_block,
  SUM(CASE WHEN status = 'LOST'         THEN cost_gross_block ELSE 0 END) AS value_lost,
  SUM(CASE WHEN status = 'CONDEMNED'    THEN cost_gross_block ELSE 0 END) AS value_condemned,
  SUM(CASE WHEN status = 'UNDER_REPAIR' THEN cost_gross_block ELSE 0 END) AS value_under_repair,
  COUNT(*) FILTER (WHERE last_verified_at IS NOT NULL AND last_verified_at > NOW() - INTERVAL '90 days') AS verified_last_90_days,
  ROUND(
    (COUNT(*) FILTER (WHERE last_verified_at IS NOT NULL AND last_verified_at > NOW() - INTERVAL '90 days'))::numeric
    / NULLIF(COUNT(*), 0) * 100, 1
  )                                              AS verification_pct
FROM reporting.v_asset_full
GROUP BY COALESCE(department, 'Unassigned');

-- ---------- v_asset_by_category -------------------------------------
CREATE OR REPLACE VIEW reporting.v_asset_by_category AS
SELECT
  major_category,
  final_category,
  sub_category,
  COUNT(*)              AS asset_count,
  SUM(cost_gross_block) AS gross_block,
  SUM(net_block)        AS net_block
FROM reporting.v_asset_full
GROUP BY major_category, final_category, sub_category;

-- ---------- v_asset_by_room -----------------------------------------
CREATE OR REPLACE VIEW reporting.v_asset_by_room AS
SELECT
  building,
  floor,
  room,
  room_code,
  room_type,
  COUNT(*)                                       AS asset_count,
  SUM(cost_gross_block)                          AS gross_block,
  MAX(last_verified_at)                          AS last_verification,
  COUNT(*) FILTER (WHERE last_verified_at IS NULL) AS never_verified_count
FROM reporting.v_asset_full
WHERE room IS NOT NULL
GROUP BY building, floor, room, room_code, room_type;

-- ---------- v_depreciation ------------------------------------------
-- One row per (asset, fiscal_year). Powers time-series depreciation
-- charts in Power BI.
CREATE OR REPLACE VIEW reporting.v_depreciation AS
SELECT
  a.id                              AS asset_id,
  a."tagCode"                       AS tag_code,
  a.name                            AS asset_name,
  d.name                            AS department,
  mc.name                           AS major_category,
  ad."fiscalYear"                   AS fiscal_year,
  ad."capDate"                      AS cap_date,
  ad."daysDep"                      AS days_dep,
  ad."depAmount"                    AS depreciation,
  ad."accumUpto"                    AS accum_depreciation,
  a."costGrossBlock" - ad."accumUpto" AS net_block_fy_end
FROM "AssetDepreciation" ad
JOIN "Asset" a          ON a.id = ad."assetId"
LEFT JOIN "MajorCategory" mc ON mc.id = a."majorCategoryId"
LEFT JOIN "Department"    d  ON d.id  = a."departmentId";

-- ---------- v_vendor_summary ----------------------------------------
CREATE OR REPLACE VIEW reporting.v_vendor_summary AS
SELECT
  vendor,
  COUNT(*)              AS asset_count,
  SUM(cost_gross_block) AS total_spend,
  MAX(voucher_date)     AS last_voucher_date,
  COUNT(DISTINCT major_category) AS categories
FROM reporting.v_asset_full
WHERE vendor IS NOT NULL
GROUP BY vendor;

-- ---------- v_purchase_order_lines ----------------------------------
CREATE OR REPLACE VIEW reporting.v_purchase_order_lines AS
SELECT
  a.id                     AS asset_id,
  a."tagCode"              AS tag_code,
  pl."poNumber"            AS po_number,
  pl."poDate"              AS po_date,
  pl."poFinancialYear"     AS po_fy,
  pl."poVendorName"        AS po_vendor,
  pl."poHsn"               AS hsn,
  pl."poQty"               AS quantity,
  pl."poBaseRate"          AS base_rate,
  pl."poCgstAmt"           AS cgst,
  pl."poSgstAmt"           AS sgst,
  pl."poIgstAmt"           AS igst,
  pl."poTotalAmount"       AS total_amount,
  pl."poMatchConfidence"   AS match_confidence,
  pl."poDocumentType"      AS document_type
FROM "AssetPurchaseLine" pl
JOIN "Asset" a ON a.id = pl."assetId";

-- ---------- v_movement_history --------------------------------------
CREATE OR REPLACE VIEW reporting.v_movement_history AS
SELECT
  h.id                    AS movement_id,
  a.id                    AS asset_id,
  a."tagCode"             AS tag_code,
  a.name                  AS asset_name,
  a."costGrossBlock"      AS asset_value,
  b_from.name             AS moved_from_building,
  r_from.name             AS moved_from_room,
  b_to.name               AS moved_to_building,
  r_to.name               AS moved_to_room,
  h."movedAt"             AS moved_at,
  u.email                 AS moved_by,
  h.reason                AS reason,
  h.notes                 AS notes
FROM "AssetLocationHistory" h
JOIN "Asset" a       ON a.id  = h."assetId"
LEFT JOIN "User" u   ON u.id  = h."movedById"
LEFT JOIN "Room"  r_to    ON r_to.id  = h."roomId"
LEFT JOIN "Floor" f_to    ON f_to.id  = r_to."floorId"
LEFT JOIN "Building" b_to ON b_to.id  = f_to."buildingId"
-- previous location: look at the row immediately before, per asset
LEFT JOIN LATERAL (
  SELECT h2."roomId"
    FROM "AssetLocationHistory" h2
   WHERE h2."assetId" = h."assetId"
     AND h2."movedAt" < h."movedAt"
   ORDER BY h2."movedAt" DESC
   LIMIT 1
) prev ON TRUE
LEFT JOIN "Room"  r_from    ON r_from.id  = prev."roomId"
LEFT JOIN "Floor" f_from    ON f_from.id  = r_from."floorId"
LEFT JOIN "Building" b_from ON b_from.id  = f_from."buildingId";

-- ---------- v_verification_events -----------------------------------
CREATE OR REPLACE VIEW reporting.v_verification_events AS
SELECT
  v.id            AS verification_id,
  v."batchId"     AS batch_id,
  v.outcome       AS outcome,
  v.notes         AS notes,
  v."verifiedAt"  AS verified_at,
  a.id            AS asset_id,
  a."tagCode"     AS tag_code,
  a.name          AS asset_name,
  a."costGrossBlock" AS asset_value,
  d.name          AS department,
  r.name          AS room,
  b.name          AS building,
  u.email         AS verified_by
FROM "AssetVerification" v
JOIN "Asset" a       ON a.id = v."assetId"
LEFT JOIN "Department" d ON d.id = a."departmentId"
LEFT JOIN "Room" r       ON r.id = v."roomId"
LEFT JOIN "Floor" f      ON f.id = r."floorId"
LEFT JOIN "Building" b   ON b.id = f."buildingId"
LEFT JOIN "User" u       ON u.id = v."verifiedById";

-- ---------- v_attention_needed --------------------------------------
-- Top-N view: highest-value assets in a non-happy status. Powers the
-- "Attention Needed" table on the executive dashboard.
CREATE OR REPLACE VIEW reporting.v_attention_needed AS
SELECT
  tag_code,
  asset_name,
  department,
  room,
  cost_gross_block,
  status,
  last_verified_at,
  major_category,
  sub_category
FROM reporting.v_asset_full
WHERE status IN ('LOST', 'CONDEMNED', 'UNDER_REPAIR')
   OR (last_verified_at IS NULL AND cost_gross_block > 100000)
   OR (last_verified_at < NOW() - INTERVAL '180 days' AND cost_gross_block > 100000)
ORDER BY cost_gross_block DESC;

-- ---------- Grants: reporting_reader gets SELECT on everything -----
GRANT SELECT ON ALL TABLES IN SCHEMA reporting TO reporting_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA reporting
  GRANT SELECT ON TABLES TO reporting_reader;

-- Explicitly REVOKE any lingering access to the app schema.
REVOKE ALL ON SCHEMA public FROM reporting_reader;

COMMIT;

-- ================================================================
-- Post-run steps:
--   1. Change the reporting_reader password:
--        ALTER USER reporting_reader WITH PASSWORD 'a-real-strong-password';
--   2. Give your Power BI team:
--        host, port, database name
--        user  = reporting_reader
--        pass  = (from step 1)
--        schema = reporting
--   3. In Power BI Desktop: Get Data → PostgreSQL → paste connection.
--      All eight views appear ready to load.
-- ================================================================
