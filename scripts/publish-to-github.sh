#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
REPO_NAME="${GITHUB_REPO_NAME:-la-gazette-du-faubourg}"

# Lire GH_TOKEN depuis .env si absent de l’environnement (fichier gitignored)
if [ -z "${GH_TOKEN:-}" ] && [ -f .env ]; then
  line="$(grep -E '^[[:space:]]*GH_TOKEN=' .env 2>/dev/null | tail -1 || true)"
  if [ -n "${line}" ]; then
    val="${line#*=}"
    val="${val%$'\r'}"
    val="${val#\"}"
    val="${val%\"}"
    val="${val#\'}"
    val="${val%\'}"
    export GH_TOKEN="${val}"
  fi
fi

if ! gh auth status &>/dev/null 2>&1; then
  if [ -n "${GH_TOKEN:-}" ]; then
    echo "$GH_TOKEN" | gh auth login --with-token -h github.com
  else
    echo "Authentification GitHub requise."
    echo "  • Option A : gh auth login -h github.com -p https -w"
    echo "  • Option B : crée un PAT (scope « repo ») sur https://github.com/settings/tokens"
    echo "    puis ajoute dans .env : GH_TOKEN=ghp_… et relance : npm run github:publish"
    exit 1
  fi
fi

if git remote get-url origin &>/dev/null 2>&1; then
  echo "Remote origin déjà défini, push de main…"
  git push -u origin main
else
  gh repo create "$REPO_NAME" \
    --public \
    --description "La Gazette du Faubourg — Next.js, Prisma, Auth.js" \
    --source=. \
    --remote=origin \
    --push
fi

login="$(gh api user --jq .login)"
echo "Dépôt : https://github.com/${login}/${REPO_NAME}"
