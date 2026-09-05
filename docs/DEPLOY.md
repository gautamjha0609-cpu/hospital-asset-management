# Deploying to Vercel

The app is designed to work on Vercel out of the box: Postgres
persistence, Vercel Blob for file storage, and a build step that pushes
the schema and seeds default admin/user accounts on every deploy.

## One-click deploy

Click the button in the README, or open:

```
https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgautamjha0609-cpu%2Fhospital-asset-management&project-name=hospital-asset-management&repository-name=hospital-asset-management&env=NEXTAUTH_SECRET,DATABASE_URL,SEED_ADMIN_EMAIL,SEED_ADMIN_PASSWORD&envDescription=NEXTAUTH_SECRET%20from%20openssl%20rand%20-base64%2032%3B%20DATABASE_URL%20from%20Vercel%20Postgres%2FNeon%2FSupabase&envLink=https%3A%2F%2Fgithub.com%2Fgautamjha0609-cpu%2Fhospital-asset-management%2Fblob%2Fclaude%2Fhospital-asset-mapping-system-tddg6r%2F.env.example&build-command=npm%20run%20vercel-build&install-command=npm%20install%20--legacy-peer-deps
```

Then paste the two env vars Vercel prompts for, provision Postgres, and
you're live.

## Manual deploy (step-by-step)

### 1. Import the repo

Go to https://vercel.com/new and import
`gautamjha0609-cpu/hospital-asset-management`. Select the branch
`claude/hospital-asset-mapping-system-tddg6r` (or `main` after merge).

Vercel will detect Next.js. The build command is already configured in
`vercel.json` to run `npm run vercel-build`, which:

1. `prisma generate` — client
2. `prisma db push --skip-generate --accept-data-loss` — applies the
   schema to the connected Postgres (safe on first deploy; on subsequent
   deploys only additive changes go through, and destructive changes are
   protected by Vercel's env-var prompt in the dashboard).
3. `tsx prisma/seed/index.ts` — idempotent seed of admin/user + demo
   location tree.
4. `next build` — compile.

### 2. Provision Postgres

In the Vercel dashboard for the new project → **Storage** → **Create
Database** → **Postgres**. Vercel injects `POSTGRES_PRISMA_URL` and
friends automatically.

Set:

```
DATABASE_URL = ${POSTGRES_PRISMA_URL}
```

(You can use any Postgres — Vercel Postgres, Neon, Supabase, Railway,
your own RDS — the schema is plain Postgres.)

### 3. Enable Vercel Blob (for file uploads)

**Storage** → **Create Store** → **Blob**. Vercel injects
`BLOB_READ_WRITE_TOKEN` automatically; the app then auto-picks the
`vercel-blob` storage driver (see `src/lib/env.ts`).

If you skip this, file uploads still succeed but land on the (ephemeral)
serverless filesystem and disappear at the next cold start. For any
real deployment: enable Blob.

### 4. Set required env vars

Project settings → **Environment Variables**:

| Name | Value | Source |
|---|---|---|
| `NEXTAUTH_SECRET` | 32-byte random string | `openssl rand -base64 32` |
| `SEED_ADMIN_EMAIL` | your admin email | you |
| `SEED_ADMIN_PASSWORD` | strong password | you |
| `SEED_USER_EMAIL` | your user email | you |
| `SEED_USER_PASSWORD` | strong password | you |
| `DATABASE_URL` | Postgres URL | auto if Vercel Postgres |
| `BLOB_READ_WRITE_TOKEN` | Blob token | auto if Vercel Blob |

Optional:

- `PUBLIC_APP_URL` — leave unset; the app falls back to
  `https://$VERCEL_URL` for QR codes and Excel round-trip URLs.

### 5. Deploy

Push a commit or click **Redeploy** in Vercel. Watch the build log:
you should see the four steps of `vercel-build` succeed in order.

### 6. First login

Open the Vercel URL, go to `/login`, sign in with the seed admin
credentials. **Change the password inside the app immediately** — the
seed does not overwrite passwords on subsequent deploys, so once you
change it you're safe.

## Local dev (SQLite)

For zero-setup local dev you can switch back to SQLite:

1. In `prisma/schema.prisma`, change
   `provider = "postgresql"` → `provider = "sqlite"`.
2. `DATABASE_URL="file:./prisma/dev.db"` in `.env.local`.
3. `npx prisma migrate dev --name init`.
4. `npm run seed && npm run dev`.

**Don't commit that switch back** — the deploy path expects Postgres.
Prefer running a Postgres locally with `docker run -e POSTGRES_PASSWORD=x -p 5432:5432 postgres:16` and pointing `DATABASE_URL` at it — that way local dev and prod stay identical.

## Importing the real workbook after deploy

Two options:

1. **UI** — Log in as admin → `/admin/import` → upload the `.xlsx` → run
   a dry-run first, then commit.
2. **CLI** (from your laptop, against the prod DB — use with care):
   ```
   DATABASE_URL="prod-url" XLSX_PATH=/path/to/workbook.xlsx npm run seed:xlsx
   ```

Both preserve any in-app location assignments on re-import.
