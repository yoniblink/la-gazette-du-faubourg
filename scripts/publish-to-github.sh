#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
REPO_NAME="${GITHUB_REPO_NAME:-la-gazette-du-faubourg}"

# Lire GH_TOKEN ou GITHUB_TOKEN depuis .env (gh utilise la variable GH_TOKEN)
if [ -z "${GH_TOKEN:-}" ] && [ -f .env ]; then
  for key in GH_TOKEN GITHUB_TOKEN; do
    line="$(grep -E "^[[:space:]]*${key}=" .env 2>/dev/null | tail -1 || true)"
    if [ -n "${line}" ]; then
      val="${line#*=}"
      val="${val%$'\r'}"
      val="${val#\"}"
      val="${val%\"}"
      val="${val#\'}"
      val="${val%\'}"
      export GH_TOKEN="${val}"
      break
    fi
  done
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
  gh auth setup-git
  git push -u origin main
else
  if ! gh repo create "$REPO_NAME" \
    --public \
    --description "La Gazette du Faubourg — Next.js, Prisma, Auth.js" \
    --source=. \
    --remote=origin \
    --push 2>&1; then
    echo ""
    echo "Création via l’API impossible avec ce jeton (droits insuffisants)."
    echo "1) Crée un dépôt vide sur https://github.com/new (nom : ${REPO_NAME}, sans README), puis :"
    login="$(gh api user --jq .login)"
    echo "   git remote add origin https://github.com/${login}/${REPO_NAME}.git"
    echo "   gh auth setup-git && git push -u origin main"
    echo "2) Ou un PAT classic avec scope « repo » : https://github.com/settings/tokens/new"
    exit 1
  fi
fi

login="$(gh api user --jq .login)"
echo "Dépôt : https://github.com/${login}/${REPO_NAME}"
