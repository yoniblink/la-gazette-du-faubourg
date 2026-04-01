/**
 * Enchaîne : import WP → normalisation URLs + couverture → hydratation images Supabase.
 *
 * Prérequis : WordPress local joignable, DATABASE_URL, Supabase (hydratation).
 *
 * Usage :
 *   SYNC_ARTICLE_SLUG=une-nouvelle-generationde-quantieme-perpetuel GAZETTE_IMPORT_CATEGORY_SLUG=horlogerie-joaillerie npx tsx scripts/wp-sync-article-from-local.ts
 *
 * Optionnel : WORDPRESS_IMPORT_BASE_URL, FIX_WP_CLEAR_COVER=0 pour garder l’image à la une
 */
import { execSync } from "node:child_process";
import path from "node:path";

const slug = process.env.SYNC_ARTICLE_SLUG?.trim();
const cat = process.env.GAZETTE_IMPORT_CATEGORY_SLUG?.trim();

if (!slug) {
  console.error("Définir SYNC_ARTICLE_SLUG=… (slug WordPress / Prisma)");
  process.exit(1);
}
if (!cat) {
  console.error("Définir GAZETTE_IMPORT_CATEGORY_SLUG=… (ex. horlogerie-joaillerie)");
  process.exit(1);
}

const root = process.cwd();
const baseEnv = {
  ...process.env,
  WORDPRESS_IMPORT_BASE_URL: process.env.WORDPRESS_IMPORT_BASE_URL ?? "http://lagazettedufaubourg.local",
  WORDPRESS_IMPORT_POST_SLUGS: slug,
  GAZETTE_IMPORT_CATEGORY_SLUG: cat,
  FIX_WP_ARTICLE_SLUG: slug,
  HYDRATE_ARTICLE_SLUG: slug,
};

function run(label: string, script: string) {
  console.log(`\n— ${label} —\n`);
  execSync(`npx tsx "${path.join(root, script)}"`, {
    stdio: "inherit",
    env: baseEnv,
    cwd: root,
  });
}

run("Import WordPress → Prisma", "scripts/import-wp-category-articles.ts");
run("Normalisation affichage (URLs, couverture)", "scripts/fix-article-wp-display.ts");
run("Hydratation images → Supabase", "scripts/hydrate-article-inline-images.ts");

console.log(`\nTerminé : ${slug} → /${cat}/${slug}`);
