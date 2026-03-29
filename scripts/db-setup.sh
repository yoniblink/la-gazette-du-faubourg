#!/usr/bin/env bash
# Applique les migrations et le seed. Prérequis : .env avec DATABASE_URL + DIRECT_URL (voir .env.example, ex. Supabase).
set -euo pipefail
cd "$(dirname "$0")/.."

npx prisma migrate deploy
npm run db:seed

echo ""
echo "Connexion admin : email et mot de passe = valeurs ADMIN_EMAIL / ADMIN_PASSWORD dans .env"
echo "Par défaut : admin@lagazettedufaubourg.local / changeme"
