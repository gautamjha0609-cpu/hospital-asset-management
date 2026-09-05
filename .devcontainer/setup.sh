#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing npm dependencies…"
npm install --no-audit --no-fund --legacy-peer-deps

echo "==> Waiting for Postgres…"
for i in {1..60}; do
  if pg_isready -h db -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> Generating Prisma client and pushing schema…"
npx prisma generate
npx prisma db push --skip-generate --accept-data-loss

echo "==> Seeding demo data (admin+user, categories, demo floor + rooms)…"
npx tsx prisma/seed/index.ts

echo ""
echo "======================================================================"
echo "  Codespace ready."
echo "  Server will start on http://localhost:3000 in the attached terminal."
echo "  Sign in with:"
echo "    admin@hospital.local  /  ChangeMe!Admin2026"
echo "    user@hospital.local   /  ChangeMe!User2026"
echo "  (Change these inside the app or in devcontainer.json for security.)"
echo "======================================================================"
