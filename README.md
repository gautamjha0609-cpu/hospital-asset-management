# Hospital Asset Management System

A production-quality Next.js application for mapping, tracking, and managing
hospital assets across buildings, floors, and rooms — grounded in the
actual `Asset Detail` sheet supplied for the pilot deployment (19,406 asset
lines, 93 columns).

- Interactive 2D floor-plan editor (SVG-based; rooms, walls, doors,
  labels, and asset markers are structured DB rows, not baked pixels).
- Full asset lifecycle: create, edit, move, condemn, image, document, QR.
- Excel import (with column-mapping, validation preview, and clear
  imported/updated/skipped/errors/duplicates summary) and Excel export
  (with a stable asset URL column for round-trip traceability).
- Admin / User RBAC enforced server-side; frontend hides admin actions.
- Audit log of all admin changes.

Full design rationale — including which reference projects were reused as
code, which as inspiration only, and why — is in
[`docs/ARCHITECTURE_ANALYSIS.md`](docs/ARCHITECTURE_ANALYSIS.md). The
schema is grounded in the workbook, documented column-by-column in
[`docs/EXCEL_DATA_DICTIONARY.md`](docs/EXCEL_DATA_DICTIONARY.md).

## Local development

```bash
cp .env.example .env.local
npm install                      # installs deps and prisma-generates
npx prisma migrate dev --name init
npm run seed                     # creates default admin + user + demo location tree
npm run dev                      # http://localhost:3000
```

Default dev accounts (change the passwords in `.env.local` before use):

- **admin@hospital.local** — full admin rights.
- **user@hospital.local** — read-only user.

## Importing the real workbook

For local development only:

```bash
# One-shot import of an .xlsx workbook — expects an "Asset Detail" sheet
XLSX_PATH=/absolute/path/to/workbook.xlsx npm run seed:xlsx
```

For production, use the in-app admin flow at **/admin/import** which offers
column mapping, validation preview, dry-run, and a downloadable error
report.

## Deployment

The repo ships a `vercel.json` that runs `prisma generate && next build`.
Set these Vercel environment variables:

- `DATABASE_URL` — a Postgres URL (Vercel Postgres, Neon, or Supabase).
- `NEXTAUTH_SECRET` — output of `openssl rand -base64 32`.
- `NEXTAUTH_URL`, `PUBLIC_APP_URL` — your deployment URL.
- `STORAGE_DRIVER=s3` and the `S3_*` variables for a real bucket.

The SQLite provider is dev-only. For production, edit
`prisma/schema.prisma` to switch the datasource to `postgresql` and run
`npx prisma migrate deploy`.

## Testing

```bash
npm run typecheck
npm run test         # vitest unit tests
npm run e2e          # playwright smoke tests (needs a running dev server)
```

## Repository layout

```
docs/                architecture and data-dictionary docs
prisma/schema.prisma the data model, grounded in the source workbook
prisma/seed/         seed script + optional workbook importer
src/app/             Next.js app router pages and API routes
src/components/      reusable UI + the SVG map editor
src/lib/             prisma, auth, storage, audit, validation
tests/               vitest + playwright
```
