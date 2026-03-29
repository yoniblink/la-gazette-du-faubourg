#!/usr/bin/env bash
# Applique les migrations et le seed (SQLite par défaut : DATABASE_URL=file:./prisma/dev.db dans .env).
# Si vous utilisez Postgres + Docker : docker compose up -d puis mettez DATABASE_URL en conséquence.
set -euo pipefail
cd "$(dirname "$0")/.."

npx prisma migrate deploy
npm run db:seed

echo ""
echo "Connexion admin : email et mot de passe = valeurs ADMIN_EMAIL / ADMIN_PASSWORD dans .env"
echo "Par défaut : admin@lagazettedufaubourg.local / changeme"
