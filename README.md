# Hospital Asset Management System

A production-quality Next.js application for mapping, tracking, and
managing hospital assets across buildings, floors, and rooms —
grounded in the actual `Asset Detail` sheet supplied for the pilot
(19,406 asset lines, 93 columns).

- Interactive 2D floor-plan editor (SVG-based; rooms, walls, doors,
  labels, and asset markers are structured DB rows, not baked pixels).
- Full asset lifecycle: create, edit, move, condemn, image, document,
  QR code.
- Excel import (dry-run preview, column mapping, per-row error report)
  and Excel export (with a stable Asset URL hyperlink for round-trip
  traceability).
- Admin / User RBAC enforced server-side; frontend hides admin actions.
- Audit log of all admin changes.
- Postgres + Vercel Blob out of the box; ships with `vercel.json` and
  a one-click deploy button.

## 🚀 Deploy to Vercel (one click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgautamjha0609-cpu%2Fhospital-asset-management&project-name=hospital-asset-management&repository-name=hospital-asset-management&env=NEXTAUTH_SECRET,SEED_ADMIN_EMAIL,SEED_ADMIN_PASSWORD&envDescription=NEXTAUTH_SECRET%20%3D%20openssl%20rand%20-base64%2032%20%7C%20SEED_ADMIN_%2A%20%3D%20your%20first%20admin%20login&envLink=https%3A%2F%2Fgithub.com%2Fgautamjha0609-cpu%2Fhospital-asset-management%2Fblob%2Fmain%2F.env.example&stores=%5B%7B%22type%22%3A%22postgres%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D)

The button:

1. Clones this repo into your Vercel account.
2. Prompts you for `NEXTAUTH_SECRET` and admin login (env vars).
3. Provisions **Vercel Postgres** and **Vercel Blob** and connects them.
4. Runs the build (which pushes the schema, seeds admin+user, and
   compiles the app).

After the deploy finishes, open the URL, sign in with the admin
credentials you set, and **change the password inside the app** (the
seed script never overwrites a user password after first create).

The full step-by-step (manual, with troubleshooting) is in
[docs/DEPLOY.md](docs/DEPLOY.md).

## Local development

```bash
cp .env.example .env.local
# Edit .env.local: set DATABASE_URL to a postgres:// URL you can reach.
# Fastest way — a throwaway local Postgres:
#   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=x --name hpg postgres:16
#   DATABASE_URL="postgresql://postgres:x@localhost:5432/postgres?schema=public"

npm install
npx prisma db push
npm run seed
npm run dev             # http://localhost:3000
```

Default seed accounts (change in `.env.local` before use):

- **admin@hospital.local** / `ChangeMe!Admin2026` — full admin rights.
- **user@hospital.local** / `ChangeMe!User2026` — read-only user.

### SQLite for zero-dependency local dev

If you don't want to run Postgres locally, temporarily edit
`prisma/schema.prisma` to `provider = "sqlite"` and use
`DATABASE_URL="file:./prisma/dev.db"`. Don't commit that change — prod
requires Postgres.

## Importing the real workbook

```bash
# One-shot import — expects an "Asset Detail" sheet
XLSX_PATH=/absolute/path/to/workbook.xlsx npm run seed:xlsx
```

For production use, sign in as admin → **/admin/import** in the app —
that path also offers dry-run preview, per-row error reports, and
preserves in-app location assignments across re-imports.

## Testing

```bash
npm run typecheck       # tsc --noEmit
npm run test            # vitest unit tests
npm run e2e             # playwright smoke tests
```

## Documentation

- [docs/DEPLOY.md](docs/DEPLOY.md) — step-by-step Vercel deploy
- [docs/USER_GUIDE.md](docs/USER_GUIDE.md) — walkthrough for admin/user
- [docs/ARCHITECTURE_ANALYSIS.md](docs/ARCHITECTURE_ANALYSIS.md) —
  design decisions and reference-project audit
- [docs/EXCEL_DATA_DICTIONARY.md](docs/EXCEL_DATA_DICTIONARY.md) —
  column-by-column mapping of the source workbook
- [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) — attribution

## Repository layout

```
docs/                architecture, data dictionary, deploy, user guide
prisma/schema.prisma the data model, grounded in the source workbook
prisma/seed/         seed script + optional workbook importer
src/app/             Next.js app router pages and API routes
src/components/      reusable UI + the SVG map editor
src/lib/             prisma, auth, storage, audit, validation
tests/               vitest + playwright
```
