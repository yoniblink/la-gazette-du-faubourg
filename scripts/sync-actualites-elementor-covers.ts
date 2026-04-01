/**
 * Aligne les couvertures des articles listés sur la page WP « Actualités » (Elementor)
 * avec les fichiers réellement affichés sur cette page (souvent différents du featured_media).
 *
 * Usage : npm run sync:actualites-elementor-covers
 *
 * WORDPRESS_IMPORT_BASE_URL (défaut : http://lagazettedufaubourg.local)
 * IMPORT_WP_MEDIA_LOCAL=1 — enregistrement sous public/uploads/wp-import (pas Supabase)
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  createSupabaseServiceRoleClient,
  getMediaStorageBucket,
  hasSupabaseMediaStorageEnv,
} from "@/lib/supabase-service";

const WP_BASE = (process.env.WORDPRESS_IMPORT_BASE_URL ?? "http://lagazettedufaubourg.local").replace(
  /\/$/,
  "",
);
const OUT_DIR = path.join(process.cwd(), "public", "uploads", "wp-import");
const FORCE_LOCAL = process.env.IMPORT_WP_MEDIA_LOCAL === "1";
const SUPABASE_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const ACTUALITES_PAGE_SLUG = "actualites";

function sanitizeSlug(s: string): string {
  const t = s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return t || "article";
}

function sanitizeFilename(original: string, mimeType: string): { base: string; ext: string } {
  const safe = original.replace(/[^\w.\-]+/g, "_") || "image";
  const ext =
    path.extname(safe) ||
    (mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg");
  const base = path.basename(safe, ext).slice(0, 80) || "image";
  return { base, ext };
}

function extFromUrl(urlStr: string): string {
  try {
    const p = new URL(urlStr).pathname;
    const e = path.extname(p).toLowerCase();
    if (e && e.length <= 6) return e;
  } catch {
    /* ignore */
  }
  return ".jpg";
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, "\u201c")
    .replace(/&#8221;/g, "\u201d")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

type Pair = { slug: string; img: string; alt: string | null };

async function fetchElementorCoverPairs(): Promise<Pair[]> {
  const u = new URL("/wp-json/wp/v2/pages", WP_BASE);
  u.searchParams.set("slug", ACTUALITES_PAGE_SLUG);
  const res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`WP pages: ${res.status}`);
  const arr = (await res.json()) as Array<{ content?: { rendered?: string } }>;
  const html = arr[0]?.content?.rendered;
  if (!html) throw new Error("Page Actualités introuvable ou vide");

  const re =
    /<a[^>]+href="https?:\/\/[^"]+\/([^"/]+)\/?"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>/gi;
  const raw: Pair[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const slug = m[1];
    let img = m[2];
    if (!img.startsWith("http")) {
      img = new URL(img, WP_BASE).href;
    }
    const altM = m[0].match(/\balt="([^"]*)"/);
    const alt = altM ? decodeBasicEntities(altM[1]).trim() || null : null;
    raw.push({ slug, img, alt });
  }

  const seen = new Set<string>();
  const deduped: Pair[] = [];
  for (const p of raw) {
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    deduped.push(p);
  }
  return deduped;
}

type ImportCtx = {
  useSupabase: boolean;
  admin: ReturnType<typeof createSupabaseServiceRoleClient> | null;
  bucket: string;
};

async function ensureMediaFromImageUrl(
  prisma: PrismaClient,
  articleSlug: string,
  imageUrl: string,
  alt: string | null,
  ctx: ImportCtx,
): Promise<{ url: string } | null> {
  const pathname = new URL(imageUrl).pathname;
  const wpBasename = path.basename(pathname) || "cover";
  const safeArticle = sanitizeSlug(articleSlug).slice(0, 60);
  const filename = `elementor-actualites-${safeArticle}-${wpBasename.replace(/[^\w.\-]+/g, "_")}`;

  const existing = await prisma.media.findFirst({ where: { filename } });
  if (existing) {
    return { url: existing.url };
  }

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    console.error(`[fetch] ${articleSlug} ${imageUrl} → ${imgRes.status}`);
    return null;
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  if (buf.length === 0) return null;

  const headerMime = imgRes.headers.get("content-type")?.split(";")[0]?.trim() || "";
  const ext = extFromUrl(imageUrl);
  const mimeType =
    headerMime && headerMime.startsWith("image/")
      ? headerMime
      : ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : ext === ".gif"
            ? "image/gif"
            : "image/jpeg";

  const { useSupabase, admin, bucket } = ctx;
  let publicUrl: string;

  if (useSupabase && admin !== null && SUPABASE_IMAGE_MIMES.has(mimeType)) {
    const folder = randomBytes(8).toString("hex");
    const unique = randomBytes(8).toString("hex");
    const { base: storageBase, ext: storageExt } = sanitizeFilename(filename, mimeType);
    const storagePath = `admin-media/${folder}/${storageBase}-${unique}${storageExt}`;
    const { error: upErr } = await admin.storage.from(bucket).upload(storagePath, buf, {
      contentType: mimeType,
      upsert: true,
    });
    if (upErr) {
      console.error(`[supabase] ${articleSlug}: ${upErr.message}`);
      return null;
    }
    const { data: pub } = admin.storage.from(bucket).getPublicUrl(storagePath);
    publicUrl = pub.publicUrl;
  } else {
    await mkdir(OUT_DIR, { recursive: true });
    const localName = filename.includes(".") ? filename : `${filename}${ext}`;
    await writeFile(path.join(OUT_DIR, path.basename(localName)), buf);
    publicUrl = `/uploads/wp-import/${path.basename(localName)}`;
  }

  await prisma.media.create({
    data: {
      url: publicUrl,
      filename,
      mimeType,
      width: null,
      height: null,
      alt: alt ? alt.slice(0, 500) : null,
    },
  });

  console.log(`[import] ${articleSlug} → ${filename}`);
  return { url: publicUrl };
}

async function main() {
  const pairs = await fetchElementorCoverPairs();
  console.log(`Page Elementor : ${pairs.length} article(s) (première tuile par slug)`);

  const prisma = new PrismaClient();
  const useSupabase = !FORCE_LOCAL && hasSupabaseMediaStorageEnv();
  const admin = useSupabase ? createSupabaseServiceRoleClient() : null;
  const bucket = useSupabase ? getMediaStorageBucket() : "";
  const ctx: ImportCtx = { useSupabase, admin, bucket };

  let updated = 0;
  let missingArticle = 0;
  let failed = 0;

  for (const { slug, img, alt } of pairs) {
    const article = await prisma.article.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: { id: true, title: true, coverImageUrl: true, coverImageAlt: true },
    });
    if (!article) {
      console.warn(`[skip] aucun article publié pour slug=${slug}`);
      missingArticle += 1;
      continue;
    }

    const ensured = await ensureMediaFromImageUrl(prisma, slug, img, alt, ctx);
    if (!ensured) {
      failed += 1;
      continue;
    }

    const altFinal = (alt && alt.trim()) || stripTags(article.title).slice(0, 500);

    if (article.coverImageUrl === ensured.url && article.coverImageAlt === altFinal) {
      continue;
    }

    await prisma.article.update({
      where: { id: article.id },
      data: {
        coverImageUrl: ensured.url,
        coverImageAlt: altFinal,
      },
    });
    updated += 1;
    console.log(`OK ${slug}`);
  }

  await prisma.$disconnect();
  console.log(
    `Terminé : ${updated} article(s) mis à jour, ${missingArticle} slug(s) sans article, ${failed} échec(s) import.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
