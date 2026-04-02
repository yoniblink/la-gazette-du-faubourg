/**
 * Remplace « Carita » / « Carila » par « Carlita » (toutes casses), corrige le slug …-maison-carila → …-maison-carlita.
 *
 * Usage (slug DB encore en -carila) :
 *   FIX_ARTICLE_SLUG=3-questions-a-john-nollet-directeur-artistique-maison-carila npx tsx scripts/replace-carita-carlita.ts
 *
 * Tous les articles :
 *   REPLACE_CARITA_ALL=1 npx tsx scripts/replace-carita-carlita.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const SLUG = process.env.FIX_ARTICLE_SLUG?.trim();
const ALL = process.env.REPLACE_CARITA_ALL === "1";

function replaceCaritaInString(s: string): string {
  return s
    .replace(/\bCARITA\b/g, "CARLITA")
    .replace(/\bCarita\b/g, "Carlita")
    .replace(/\bcarita\b/g, "carlita")
    .replace(/\bCARILA\b/g, "CARLITA")
    .replace(/\bCarila\b/g, "Carlita")
    .replace(/\bcarila\b/g, "carlita");
}

function fixMaisonCarilaSlug(slug: string): string | undefined {
  if (!slug.includes("maison-carila")) return undefined;
  const next = slug.replaceAll("maison-carila", "maison-carlita");
  return next === slug ? undefined : next;
}

function walkJson(value: unknown): unknown {
  if (typeof value === "string") {
    return replaceCaritaInString(value);
  }
  if (Array.isArray(value)) {
    return value.map(walkJson);
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      out[k] = walkJson(v);
    }
    return out;
  }
  return value;
}

function patchArticleFields<T extends Record<string, unknown>>(row: T): Partial<T> {
  const data: Partial<T> = {};
  if (typeof row.slug === "string") {
    const nextSlug = fixMaisonCarilaSlug(row.slug);
    if (nextSlug) (data as { slug: string }).slug = nextSlug;
  }
  const strKeys = [
    "title",
    "excerpt",
    "coverImageAlt",
    "kicker",
    "seoTitle",
    "seoDescription",
    "sourceUrl",
  ] as const;
  for (const k of strKeys) {
    const v = row[k];
    if (typeof v === "string" && replaceCaritaInString(v) !== v) {
      (data as Record<string, string>)[k] = replaceCaritaInString(v);
    }
  }
  const nextContent = walkJson(row.content);
  if (JSON.stringify(nextContent) !== JSON.stringify(row.content)) {
    (data as { content: unknown }).content = nextContent as T["content"];
  }
  return data;
}

async function main() {
  if (!ALL && !SLUG) {
    console.error("Définir FIX_ARTICLE_SLUG=… ou REPLACE_CARITA_ALL=1");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const articles = await prisma.article.findMany({
    where: ALL ? {} : { slug: SLUG! },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImageAlt: true,
      kicker: true,
      seoTitle: true,
      seoDescription: true,
      sourceUrl: true,
      content: true,
    },
  });

  let n = 0;
  for (const row of articles) {
    const data = patchArticleFields(row as unknown as Record<string, unknown>);
    if (Object.keys(data).length === 0) continue;
    await prisma.article.update({ where: { id: row.id }, data });
    console.log("Mis à jour :", row.slug);
    n += 1;
  }

  console.log(n ? `${n} article(s) modifié(s).` : "Aucun changement (déjà à jour ou slug inconnu).");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
