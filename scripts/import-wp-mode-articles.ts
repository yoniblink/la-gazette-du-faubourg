/**
 * Importe les articles WordPress d’une catégorie (ex. Mode) vers Prisma.
 * Par défaut : https://www.lagazettedufaubourg.fr — catégorie WP id 16 → rubrique Gazette `mode`.
 *
 * Usage : npx tsx scripts/import-wp-mode-articles.ts
 * Variables optionnelles (.env) :
 *   WORDPRESS_IMPORT_BASE_URL  (défaut : https://www.lagazettedufaubourg.fr)
 *   WORDPRESS_IMPORT_CATEGORY_ID (défaut : 16)
 *   GAZETTE_IMPORT_CATEGORY_SLUG (défaut : mode)
 */
import "dotenv/config";
import { generateJSON } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import { PrismaClient, ArticleStatus, ArticleLayout } from "@prisma/client";
import { getTiptapExtensions } from "@/lib/tiptap/extensions";

const WP_BASE = (process.env.WORDPRESS_IMPORT_BASE_URL ?? "https://www.lagazettedufaubourg.fr").replace(
  /\/$/,
  "",
);
const WP_CATEGORY_ID = Number(process.env.WORDPRESS_IMPORT_CATEGORY_ID ?? "16");
const GAZETTE_CATEGORY_SLUG = process.env.GAZETTE_IMPORT_CATEGORY_SLUG ?? "mode";

function stripHtml(html: string): string {
  const t = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return decodeHtmlEntities(t);
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&hellip;/gi, "…")
    .replace(/&#8230;/g, "…")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function wpTitle(t: string): string {
  return stripHtml(t);
}

type WpPost = {
  id: number;
  date: string;
  slug: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  featured_media: number;
  _embedded?: {
    author?: Array<{ name: string }>;
    "wp:featuredmedia"?: Array<{
      source_url: string;
      alt_text: string;
      title?: { rendered: string };
    }>;
  };
};

async function fetchPostsPage(page: number): Promise<WpPost[]> {
  const u = new URL("/wp-json/wp/v2/posts", WP_BASE);
  u.searchParams.set("categories", String(WP_CATEGORY_ID));
  u.searchParams.set("per_page", "100");
  u.searchParams.set("page", String(page));
  u.searchParams.set("_embed", "1");
  const r = await fetch(u);
  if (r.status === 400) return [];
  if (!r.ok) throw new Error(`WordPress ${r.status} ${u.toString()}`);
  return r.json() as Promise<WpPost[]>;
}

async function fetchAllWpPosts(): Promise<WpPost[]> {
  const all: WpPost[] = [];
  let page = 1;
  while (true) {
    const batch = await fetchPostsPage(page);
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return all;
}

function firstImageSrcFromDoc(doc: object): string | null {
  const walk = (n: unknown): string | null => {
    if (!n || typeof n !== "object") return null;
    const o = n as { type?: string; attrs?: { src?: string }; content?: unknown[] };
    if (o.type === "image" && typeof o.attrs?.src === "string") return o.attrs.src;
    if (Array.isArray(o.content)) {
      for (const c of o.content) {
        const u = walk(c);
        if (u) return u;
      }
    }
    return null;
  };
  return walk(doc);
}

async function main() {
  const prisma = new PrismaClient();
  const category = await prisma.category.findUnique({ where: { slug: GAZETTE_CATEGORY_SLUG } });
  if (!category) {
    console.error(`Rubrique Gazette introuvable (slug): ${GAZETTE_CATEGORY_SLUG}`);
    process.exit(1);
  }

  const posts = await fetchAllWpPosts();
  console.log(`${posts.length} article(s) WordPress (categories=${WP_CATEGORY_ID})`);

  const extensions = getTiptapExtensions();

  for (const post of posts) {
    const slug = post.slug;
    const title = wpTitle(post.title.rendered);
    let excerpt = stripHtml(post.excerpt.rendered);
    if (!excerpt) excerpt = title;
    if (excerpt.length > 2000) excerpt = `${excerpt.slice(0, 1997)}…`;

    let content: object;
    try {
      content = generateJSON(`<div>${post.content.rendered}</div>`, extensions) as JSONContent;
    } catch (e) {
      console.warn(`[${slug}] generateJSON a échoué, document vide.`, e);
      content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: excerpt }] }] };
    }

    const embed = post._embedded?.["wp:featuredmedia"]?.[0];
    const coverFromFeatured = embed?.source_url?.trim() ?? "";
    const coverAlt = (
      embed?.alt_text?.trim() ||
      embed?.title?.rendered?.trim() ||
      title
    ).slice(0, 500);

    const coverFromBody = firstImageSrcFromDoc(content);
    const coverImageUrl = coverFromFeatured || coverFromBody || category.imageSrc;
    const coverImageAlt = coverAlt || title;

    const authorName = post._embedded?.author?.[0]?.name?.trim() || "La Gazette";
    const publishedAt = new Date(post.date);

    const existing = await prisma.article.findUnique({
      where: { categoryId_slug: { categoryId: category.id, slug } },
    });

    const common = {
      title,
      excerpt,
      coverImageUrl,
      coverImageAlt,
      content,
      status: ArticleStatus.PUBLISHED,
      publishedAt,
      authorName,
      seoTitle: title,
      seoDescription: excerpt.slice(0, 160),
      sourceUrl: post.link,
      layout: ArticleLayout.standard,
      categoryId: category.id,
    };

    if (existing) {
      await prisma.article.update({ where: { id: existing.id }, data: common });
      console.log(`Mis à jour : ${slug}`);
    } else {
      await prisma.article.create({ data: { slug, ...common } });
      console.log(`Créé : ${slug}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
