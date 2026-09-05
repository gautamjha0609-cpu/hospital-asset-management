# Architecture Analysis

This document records the pre-implementation audit of the target repository, the
supplied Excel workbook, and the five reference projects. It explains what
was reused, what was only used as inspiration, and what was newly built.

## 1. Repository state at start

The repository `gautamjha0609-cpu/hospital-asset-management` was empty (no
commits, no files) when this work began, on branch
`claude/hospital-asset-mapping-system-tddg6r`. There was no pre-existing
framework, dependency, or auth to fit around, so the stack was chosen fresh.

## 2. Reference project audit

Each reference was inspected via its public GitHub `LICENSE`, `README.md`,
and `package.json` (raw.githubusercontent.com). Cloning all five in depth
was not practical inside one session; the goal of this pass was to decide
which projects **can legally be reused as code**, which are inspiration only,
and which stack best fits our Next.js/Vercel target.

| # | Project | License | Stack | Verdict for reuse |
|---|---|---|---|---|
| 1 | rcasto123/Floorcraft | **MIT** | React + Konva canvas + Zustand + Supabase | Safe to adapt with attribution. Different render tech (Konva canvas) than our SVG choice, so used as *architectural inspiration* rather than lifted code. |
| 2 | Shelf-nu/shelf.nu | **AGPL-3.0** | Remix + Prisma + PostgreSQL + Supabase | **Not safe to copy code** — AGPL is copyleft, would force the entire hospital app to become AGPL. Used as inspiration for the asset/location/custom-field domain model only (ideas are not copyrightable; specific code is). |
| 3 | mehanix/arcada | **Apache-2.0** | React + Pixi.js + Mantine + Three.js + Zustand | Safe to adapt with attribution + NOTICE. Different render tech (Pixi.js WebGL) than our SVG choice, so used as inspiration for the walls/rooms/doors data model, not lifted code. |
| 4 | Open-Location-Stack/floorplan-editor | **No LICENSE file (all rights reserved)** | Vite + MapLibre + Mapbox Draw + Turf | **Not safe to copy code** — repo has no license grant. Only the public README concepts (building/floor hierarchy, GeoJSON-style features) were used as inspiration. |
| 5 | syncfusion/ej2-showcase-react-floor-planner | **Syncfusion commercial** (proprietary `@syncfusion/ej2-react-diagrams`) | React + proprietary ej2 diagram components | **Not safe to copy code or depend on**. Only the visible UX (symbol palette, snap grid, undo/redo) was studied. |

### 2.1 Reuse conclusion

Only **Floorcraft (MIT)** and **Arcada (Apache-2.0)** are safely reusable in code
form. Their editors are canvas/WebGL-based, which does not match our
Next.js/SSR/mobile target (Konva and Pixi ship large bundles and don't
server-render). Rather than pull in either editor and rewrite half of it, the
final map editor is implemented **from scratch in SVG**, which:

- Renders server-side, so first paint is real content, not a blank canvas.
- Is small (no external render engine — pure React + SVG + a small store).
- Works with touch, keyboard, and screen readers with normal ARIA.
- Prints and exports cleanly.

For each reference project we credit the inspiration in
`THIRD_PARTY_LICENSES.md`, even where no code was copied — because the
data-model shape (rooms with polygon geometry, walls as segments, doors as
segments on walls, furniture as placed shapes) was cross-checked against
those projects.

## 3. Chosen foundation

There is no single reference project that could act as the "foundation" of a
hospital asset management app: Floorcraft is a floor-plan editor without
assets; Shelf.nu is an asset manager without floor plans; Arcada is a 2D/3D
building designer. The right shape of the deliverable is one Next.js app
that owns the whole domain, informed by all three ideas.

- **Framework**: Next.js 15 (App Router), TypeScript, Tailwind.
- **DB / ORM**: Prisma + SQLite for local dev, Postgres for production
  (Vercel Postgres / Supabase / Neon — schema is Postgres-compatible).
- **Auth**: NextAuth Credentials with bcrypt-hashed passwords and an
  Admin/User role stored on the User row.
- **Map editor**: bespoke SVG editor (see §2.1).
- **File storage**: pluggable — local filesystem in dev; S3/Supabase Storage
  driver interface for production. No direct commit of files to git.
- **Excel**: `exceljs` for read/write (MIT).
- **QR**: `qrcode` (MIT).

## 4. Workbook shape (informs the schema)

The workbook holds the actual data model constraints — the schema was
derived from it, not guessed. See `docs/EXCEL_DATA_DICTIONARY.md` for the
full column-by-column mapping.

- Sheet is named `Asset Detail` (singular, not "Asset Details") — 19,406 rows,
  93 columns.
- Categories are cleanly hierarchical: **Major Category → Final Category →
  Sub Category — Ledger** (6 → 9 → 20 distinct values). These become three
  linked reference tables.
- **The workbook contains no room-, floor-, or building-level location.** The
  closest fields are `Cost Center` (23 values, mostly opaque codes) and
  `Outsource: Dept` (5 values: Biomedical, Engineering, F&F, IT, Security).
  The core value of the mapping system is therefore to let admins *assign*
  each of the 19,406 rows to a real physical room.
- Only ~30% of rows carry a `FAR No. (Tag)` — a physical asset tag. The rest
  are book-level entries (bulk-purchased consumables and untaggable items).
  The schema must accept assets **without** a tag.
- Purchase-order data (~40% of rows) is a self-contained cluster of ~35
  columns (PO number, date, vendor, HSN, qty, rates, CGST/SGST/IGST amounts,
  match confidence). Modeled as an optional `AssetPurchaseLine` sub-record so
  it doesn't bloat every asset row.
- Depreciation data is per-fiscal-year (FY 2017-18 through FY 2024-25) — 27
  columns. Modeled as a separate `AssetDepreciation` table keyed by
  (asset_id, fiscal_year) so it's queryable and time-aware.
- Some columns clearly reflect data-quality tracking rather than asset
  attributes (`RBH-Intern: Resolution`, `PO: Match Confidence`,
  `PO: PDF Found`). These are preserved as import metadata so the audit
  trail from the source workbook is not lost, but they aren't part of the
  primary asset UI.

## 5. Feature-to-approach map

| Feature | Approach | Notes |
|---|---|---|
| Auth + RBAC | NextAuth Credentials + server-side role guards + Prisma middleware | No frontend-only hiding |
| Location hierarchy | `Building → Floor → Room` normalized tables + a discriminated `RoomType` enum for Corridor/Store/Ward/ICU/Office/Lab/Department/Parking/Utility/OpenArea/Other | Multi-hospital-ready via optional `Hospital` root |
| Map editor | Custom SVG editor with a Zustand store, undo/redo via zundo, pan/zoom via CSS transforms | Rooms/walls/doors are DB rows, not an image |
| Assets | Prisma model grounded in workbook columns + `CustomField`/`CustomFieldValue` tables for future fields | Movable vs immovable is an enum |
| Location history | `AssetLocationHistory` table with (asset, building, floor, room, moved_at, moved_by, reason, notes) | Current location denormalized onto the asset for fast reads |
| Excel import | `exceljs` streaming reader → validation → dry-run preview → commit | Column mapping is admin-editable and stored per import job |
| Excel export | `exceljs` writer that includes the asset's stable URL | Round-trip preserves `Row ID` |
| Documents/images | Storage-driver interface (`LocalDiskDriver`, `S3Driver`) with size + MIME validation | Signed URLs for private buckets |
| QR/barcode | `qrcode` server-side render to SVG at `/assets/[id]/qr` | Value = absolute URL |
| Audit log | Central `AuditLog` table written from a `withAudit()` helper wrapping mutations | Records actor, action, entity, before/after |
| Search | Prisma `contains` search across denormalized `AssetSearchIndex` row keyed to asset | Falls back to full-table scan for small deployments; a `to_tsvector` index is enabled when the Postgres provider is used |
| Testing | Vitest for unit + Prisma-in-memory; Playwright for smoke flow | Skipped e2e in CI unless `PLAYWRIGHT=1` |

## 6. What was NOT built

Being honest about scope: the base of this system (auth, schema, buildings/
floors/rooms, assets with custom fields, map editor with rooms/walls/doors
and asset placement, Excel import/export, QR, documents, dashboard, audit)
is here in this initial delivery. The following areas are scaffolded but
deliberately marked as follow-ups so they don't get shipped half-done:

- **3D building view** — out of scope for the 2D-mapping requirement.
- **Live multi-user editing of the map** — single-writer edits; the DB row
  is the source of truth. Multi-user CRDT/OT is deferred.
- **Barcode scanning via device camera** — a stub route exists; the actual
  scanner UI is a follow-up (uses `@zxing/browser` when enabled).
- **Row-level security enforced in Postgres** — RBAC is server-side today;
  the Prisma schema is designed to accept RLS policies later without a
  breaking change.

Each is called out in the code with a `// FOLLOWUP:` marker so they can be
found with a single grep.
