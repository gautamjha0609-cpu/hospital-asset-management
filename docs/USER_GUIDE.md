# User Guide

Short guide to the two user roles. For architecture, see
`ARCHITECTURE_ANALYSIS.md`. For the data model, see
`EXCEL_DATA_DICTIONARY.md`.

## Sign in

Go to **/login**. Two default accounts are seeded (change these
immediately in `.env.local` before any real deployment):

- `admin@hospital.local` — full admin rights (add/edit/delete everything,
  import Excel, edit maps, manage users, change custom fields).
- `user@hospital.local` — read-only user (view assets, maps, run search,
  view permitted documents).

## As a User (read-only)

**Dashboard** at **/dashboard** — total assets, buildings, floors, rooms,
attention list (assets missing a room, missing an image), recent
movements.

**Assets** at **/assets** — a filterable table. Combine any of:
- Free-text search (tag, description, serial, barcode, voucher #).
- Major/Final/Sub category.
- Department, vendor.
- Building / floor / room.
- Movable vs immovable, status.

Click an asset row to open its full detail page at
**/assets/{publicId}** — basic info, current location (with "View on
map"), procurement, PO, per-FY depreciation, location history, status
history, custom fields, and any attached images/documents.

Every asset has a **stable URL**. Scan the QR code on the asset page
(**/api/assets/{publicId}/qr**) to open the same page on a phone.

**Buildings** at **/buildings** — the building → floor → room tree.

**Floors** at **/floors/{id}** — the floor's SVG map: rooms, walls, and
placed asset markers. Click a marker to open the asset. Zoom, pan.

**Rooms** at **/rooms/{id}** — the room's asset list.

**Global search** at **/search** — searches asset, vendor, room,
department, manufacturer.

## As an Admin

Everything above, plus:

**Buildings, floors, rooms** — Create/edit/delete inline. A room with
assets cannot be silently deleted; the API asks you to reassign, archive,
or cancel.

**Floor map editor** — On any floor page, admins get a toolbar:
- **Select** — click rooms/assets to inspect them; drag markers to move.
- **Draw room** — click points to define a polygon; "Finish room" opens
  a dialog for name/code/type.
- **Draw wall** — click two points.
- **Undo / Redo** — 100-step history.
- **Zoom** / **Reset view**.
- **Save changes** — persists rooms, walls, and asset positions. Assets
  that were dragged get a `MOVE` audit entry.

**Assets** — Create at **/assets/new**, edit at
**/assets/{id}/edit**. Change of room writes an
`AssetLocationHistory` row (with the reason if you supply one). Change
of status writes an `AssetStatusHistory` row. Both are shown on the
asset page.

**Import Excel** at **/admin/import** — Upload an `.xlsx` workbook with
an "Asset Detail" sheet. **Dry-run first** to see counts of what would be
imported / updated / skipped / duplicates / errors. Then run the real
import. An `import_job` row is stored; failed rows are downloadable as
an error report. **Location assignments made in-app are preserved on
re-import.**

**Export Excel** at **/api/assets/export** (also the "Export XLSX"
button on the assets list). Filters are honored. Includes a live "Asset
URL" hyperlink column for round-trip traceability.

**Custom fields** at **/admin/fields** — add per-asset fields
(TEXT, NUMBER, DATE, CURRENCY, BOOLEAN, DROPDOWN, MULTI_SELECT, URL,
LONG_TEXT), optionally scoped to a category.

**Users** at **/admin/users** — add new admin/user accounts.

**Audit log** at **/admin/audit** — every admin action is recorded with
actor, entity, before/after JSON.

## Deploying to Vercel

1. Push this branch to GitHub.
2. In Vercel, import the repo and set env vars from `.env.example`.
3. Provision a Postgres database (Vercel Postgres / Neon / Supabase) and
   set `DATABASE_URL`.
4. In `prisma/schema.prisma`, change `provider = "sqlite"` to
   `provider = "postgresql"` and run `npx prisma migrate deploy`
   locally against the Postgres URL to generate a Postgres migration.
5. Deploy.
