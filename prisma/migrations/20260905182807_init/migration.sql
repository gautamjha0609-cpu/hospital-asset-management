-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hospitalId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Building_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Floor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buildingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "levelIndex" INTEGER NOT NULL DEFAULT 0,
    "planWidth" REAL NOT NULL DEFAULT 2000,
    "planHeight" REAL NOT NULL DEFAULT 1400,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Floor_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "floorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ROOM',
    "description" TEXT,
    "geometry" TEXT NOT NULL,
    "labelX" REAL,
    "labelY" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Room_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MapObject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "floorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "zIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MapObject_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MajorCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FinalCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "majorCategoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinalCategory_majorCategoryId_fkey" FOREIGN KEY ("majorCategoryId") REFERENCES "MajorCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "finalCategoryId" TEXT,
    "glCode" INTEGER,
    "glDescription" TEXT,
    "depreciationRate" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubCategory_finalCategoryId_fkey" FOREIGN KEY ("finalCategoryId") REFERENCES "FinalCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "aliases" TEXT,
    "vendorCode" TEXT,
    "contact" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "workbookRowId" INTEGER,
    "tagCode" TEXT,
    "outsourceFarCode" TEXT,
    "description" TEXT NOT NULL,
    "assetType" TEXT NOT NULL DEFAULT 'MOVABLE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "condition" TEXT,
    "assetClass" TEXT,
    "tangibility" TEXT,
    "capitalized" BOOLEAN NOT NULL DEFAULT true,
    "costGrossBlock" REAL NOT NULL DEFAULT 0,
    "netBlock" REAL,
    "voucherDate" DATETIME,
    "voucherNumber" TEXT,
    "effectiveCapitalizationDate" DATETIME,
    "depreciationKey" TEXT,
    "serialNumber" TEXT,
    "modelNumber" TEXT,
    "manufacturer" TEXT,
    "barcode" TEXT,
    "qrValue" TEXT,
    "warrantyExpiry" DATETIME,
    "majorCategoryId" TEXT,
    "finalCategoryId" TEXT,
    "subCategoryId" TEXT,
    "vendorId" TEXT,
    "departmentId" TEXT,
    "costCenterId" TEXT,
    "plantCode" TEXT,
    "glCode" INTEGER,
    "buildingId" TEXT,
    "floorId" TEXT,
    "roomId" TEXT,
    "mapX" REAL,
    "mapY" REAL,
    "mapRotation" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    CONSTRAINT "Asset_majorCategoryId_fkey" FOREIGN KEY ("majorCategoryId") REFERENCES "MajorCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_finalCategoryId_fkey" FOREIGN KEY ("finalCategoryId") REFERENCES "FinalCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetPurchaseLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "poLineUid" TEXT,
    "poFinancialYear" TEXT,
    "poNumber" TEXT,
    "poDate" DATETIME,
    "poVendorCode" TEXT,
    "poVendorName" TEXT,
    "poDocumentType" TEXT,
    "poSourceFile" TEXT,
    "poSlNo" INTEGER,
    "poItemDescription" TEXT,
    "poHsn" INTEGER,
    "poUnit" TEXT,
    "poQty" REAL,
    "poFreeQty" REAL,
    "poBaseRate" REAL,
    "poDiscPct" REAL,
    "poDiscAmt" REAL,
    "poCgstRate" REAL,
    "poCgstAmt" REAL,
    "poSgstRate" REAL,
    "poSgstAmt" REAL,
    "poIgstRate" REAL,
    "poIgstAmt" REAL,
    "poDeliveryCharges" REAL,
    "poLabourCess" REAL,
    "poNetUnitPrice" REAL,
    "poTotalAmount" REAL,
    "poWorkOrderRegNo" TEXT,
    "poLineFingerprint" TEXT,
    "poIdenticalLineGroup" INTEGER,
    "poOccurrenceInGroup" INTEGER,
    "poMatchBasis" TEXT,
    "poMatchConfidence" TEXT,
    "poMatchScore" TEXT,
    "poMatchNote" TEXT,
    "poPdfFound" BOOLEAN,
    CONSTRAINT "AssetPurchaseLine_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetDepreciation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "capDate" DATETIME,
    "daysDep" INTEGER,
    "depAmount" REAL NOT NULL,
    "accumUpto" REAL NOT NULL,
    CONSTRAINT "AssetDepreciation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetImportMeta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "assetClassSource" TEXT,
    "outsourceStatus" TEXT,
    "outsourceRemarks" TEXT,
    "rbhResolution" TEXT,
    "rbhConfidence" TEXT,
    "rbhNote" TEXT,
    "sourceRowJson" TEXT,
    "importJobId" TEXT,
    CONSTRAINT "AssetImportMeta_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetImportMeta_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "appliesToCategory" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CustomFieldValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "CustomFieldValue_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CustomField" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT,
    CONSTRAINT "AssetImage_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT,
    CONSTRAINT "AssetDocument_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetLocationHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "buildingId" TEXT,
    "floorId" TEXT,
    "roomId" TEXT,
    "mapX" REAL,
    "mapY" REAL,
    "movedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "movedById" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    CONSTRAINT "AssetLocationHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetLocationHistory_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AssetLocationHistory_movedById_fkey" FOREIGN KEY ("movedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT,
    "reason" TEXT,
    CONSTRAINT "AssetStatusHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" TEXT,
    "after" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "filename" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "mappingJson" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "summaryJson" TEXT,
    CONSTRAINT "ImportJob_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportError" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importJobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "column" TEXT,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "rowJson" TEXT,
    CONSTRAINT "ImportError_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Hospital_code_key" ON "Hospital"("code");

-- CreateIndex
CREATE INDEX "Building_code_idx" ON "Building"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Building_hospitalId_code_key" ON "Building"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "Floor_buildingId_idx" ON "Floor"("buildingId");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_buildingId_floorNumber_key" ON "Floor"("buildingId", "floorNumber");

-- CreateIndex
CREATE INDEX "Room_floorId_idx" ON "Room"("floorId");

-- CreateIndex
CREATE INDEX "Room_type_idx" ON "Room"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Room_floorId_code_key" ON "Room"("floorId", "code");

-- CreateIndex
CREATE INDEX "MapObject_floorId_idx" ON "MapObject"("floorId");

-- CreateIndex
CREATE INDEX "MapObject_kind_idx" ON "MapObject"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "MajorCategory_name_key" ON "MajorCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FinalCategory_majorCategoryId_name_key" ON "FinalCategory"("majorCategoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SubCategory_finalCategoryId_name_key" ON "SubCategory"("finalCategoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_name_key" ON "Vendor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_vendorCode_key" ON "Vendor"("vendorCode");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_code_key" ON "CostCenter"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_publicId_key" ON "Asset"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_workbookRowId_key" ON "Asset"("workbookRowId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_tagCode_key" ON "Asset"("tagCode");

-- CreateIndex
CREATE INDEX "Asset_tagCode_idx" ON "Asset"("tagCode");

-- CreateIndex
CREATE INDEX "Asset_majorCategoryId_idx" ON "Asset"("majorCategoryId");

-- CreateIndex
CREATE INDEX "Asset_finalCategoryId_idx" ON "Asset"("finalCategoryId");

-- CreateIndex
CREATE INDEX "Asset_subCategoryId_idx" ON "Asset"("subCategoryId");

-- CreateIndex
CREATE INDEX "Asset_departmentId_idx" ON "Asset"("departmentId");

-- CreateIndex
CREATE INDEX "Asset_vendorId_idx" ON "Asset"("vendorId");

-- CreateIndex
CREATE INDEX "Asset_buildingId_idx" ON "Asset"("buildingId");

-- CreateIndex
CREATE INDEX "Asset_floorId_idx" ON "Asset"("floorId");

-- CreateIndex
CREATE INDEX "Asset_roomId_idx" ON "Asset"("roomId");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_assetType_idx" ON "Asset"("assetType");

-- CreateIndex
CREATE UNIQUE INDEX "AssetPurchaseLine_assetId_key" ON "AssetPurchaseLine"("assetId");

-- CreateIndex
CREATE INDEX "AssetPurchaseLine_poNumber_idx" ON "AssetPurchaseLine"("poNumber");

-- CreateIndex
CREATE INDEX "AssetPurchaseLine_poVendorName_idx" ON "AssetPurchaseLine"("poVendorName");

-- CreateIndex
CREATE INDEX "AssetDepreciation_fiscalYear_idx" ON "AssetDepreciation"("fiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "AssetDepreciation_assetId_fiscalYear_key" ON "AssetDepreciation"("assetId", "fiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "AssetImportMeta_assetId_key" ON "AssetImportMeta"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_name_key" ON "CustomField"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_assetId_fieldId_key" ON "CustomFieldValue"("assetId", "fieldId");

-- CreateIndex
CREATE INDEX "AssetImage_assetId_idx" ON "AssetImage"("assetId");

-- CreateIndex
CREATE INDEX "AssetDocument_assetId_idx" ON "AssetDocument"("assetId");

-- CreateIndex
CREATE INDEX "AssetDocument_kind_idx" ON "AssetDocument"("kind");

-- CreateIndex
CREATE INDEX "AssetLocationHistory_assetId_idx" ON "AssetLocationHistory"("assetId");

-- CreateIndex
CREATE INDEX "AssetLocationHistory_movedAt_idx" ON "AssetLocationHistory"("movedAt");

-- CreateIndex
CREATE INDEX "AssetStatusHistory_assetId_idx" ON "AssetStatusHistory"("assetId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");

-- CreateIndex
CREATE INDEX "ImportJob_actorId_idx" ON "ImportJob"("actorId");

-- CreateIndex
CREATE INDEX "ImportError_importJobId_idx" ON "ImportError"("importJobId");
