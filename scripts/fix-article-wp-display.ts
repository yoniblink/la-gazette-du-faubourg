/**
 * Après import WP : normalise les URLs médias vers WORDPRESS_IMPORT_BASE_URL
 * Par défaut la couverture en base est conservée. Pour la vider (flux Elementor) :
 *   FIX_WP_CLEAR_COVER=1
 *
 * Variables :
 *   FIX_WP_ARTICLE_SLUG   (obligatoire, ex. grand-lady-kalla)
 *   FIX_WP_CLEAR_COVER=1  pour vider coverImageUrl / coverImageAlt
 *
 * Usage : FIX_WP_ARTICLE_SLUG=mon-slug npx tsx scripts/fix-article-wp-display.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const SLUG = process.env.FIX_WP_ARTICLE_SLUG?.trim();
const CLEAR_COVER = process.env.FIX_WP_CLEAR_COVER === "1";
const WP_BASE = (process.env.WORDPRESS_IMPORT_BASE_URL ?? "http://lagazettedufaubourg.local").replace(
  /\/$/,
  "",
);

function normalizeLagazetteMediaUrl(s: string): string {
  if (!/^https?:\/\//i.test(s) || !s.toLowerCase().includes("lagazettedufaubourg")) return s;
  try {
    const u = new URL(s);
    if (!u.pathname.includes("/wp-content/")) return s;
    return `${WP_BASE}${u.pathname}${u.search || ""}`;
  } catch {
    return s;
  }
}

function rewriteUrlsInJson(value: unknown): unknown {
  if (typeof value === "string") {
    return normalizeLagazetteMediaUrl(value);
  }
  if (Array.isArray(value)) {
    return value.map(rewriteUrlsInJson);
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      out[k] = rewriteUrlsInJson(v);
    }
    return out;
  }
  return value;
}

async function main() {
  if (!SLUG) {
    console.error("Définir FIX_WP_ARTICLE_SLUG=… (slug Prisma / WordPress)");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const row = await prisma.article.findFirst({
    where: { slug: SLUG },
    select: { id: true, title: true },
  });
  if (!row) {
    console.error(`Article introuvable : ${SLUG}`);
    process.exit(1);
  }

  const full = await prisma.article.findUnique({ where: { id: row.id } });
  if (!full) process.exit(1);

  const content = rewriteUrlsInJson(full.content) as object;

  await prisma.article.update({
    where: { id: row.id },
    data: {
      ...(CLEAR_COVER ? { coverImageUrl: "", coverImageAlt: "" } : {}),
      content,
    },
  });

  console.log(
    `OK ${SLUG} : ${CLEAR_COVER ? "couverture vidée ; " : ""}médias normalisés → ${WP_BASE}`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
