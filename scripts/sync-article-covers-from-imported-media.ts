/**
 * Met à jour coverImageUrl / coverImageAlt de chaque article publié
 * en utilisant les fichiers importés par import-wp-media (filename wp-{attachmentId}-…).
 *
 * Pour chaque article, interroge WordPress (slug) pour lire featured_media,
 * puis cherche la ligne Media Prisma dont le filename commence par wp-{id}-.
 * Si l’image à la une n’a pas été importée (médiathèque volumineuse), elle est
 * téléchargée et enregistrée comme lors de import-wp-media (Supabase ou disque).
 *
 * Usage : npm run sync:article-covers
 *
 * WORDPRESS_IMPORT_BASE_URL (défaut : http://lagazettedufaubourg.local)
 * IMPORT_WP_MEDIA_LOCAL=1 — même effet que pour import-wp-media (pas de Supabase)
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

type WpPostRow = {
  slug: string;
  featured_media: number;
  title: { rendered: string };
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      alt_text?: string;
      title?: { rendered?: string };
    }>;
  };
};

type WpMediaItem = {
  id: number;
  slug: string;
  source_url: string;
  mime_type: string;
  media_type: string;
  alt_text: string;
  title?: { rendered?: string };
  media_details?: { width?: number; height?: number };
};

function sanitizeSlug(s: string): string {
  const t = s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return t || "image";
}

function sanitizeFilename(original: string, mimeType: string): { base: string; ext: string } {
  const safe = original.replace(/[^\w.\-]+/g, "_") || "image";
  const ext =
    path.extname(safe) ||
    (mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg");
  const base = path.basename(safe, ext).slice(0, 80) || "image";
  return { base, ext };
}

function extFromUrl(urlStr: string, mime: string): string {
  try {
    const p = new URL(urlStr).pathname;
    const e = path.extname(p).toLowerCase();
    if (e && e.length <= 6) return e;
  } catch {
    /* ignore */
  }
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return ".bin";
}

async function fetchWpPostBySlug(slug: string): Promise<WpPostRow | null> {
  const u = new URL("/wp-json/wp/v2/posts", WP_BASE);
  u.searchParams.set("slug", slug);
  u.searchParams.set("_embed", "1");
  const res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const arr = (await res.json()) as WpPostRow[];
  return arr[0] ?? null;
}

async function fetchWpMediaById(id: number): Promise<WpMediaItem | null> {
  const u = new URL(`/wp-json/wp/v2/media/${id}`, WP_BASE);
  const res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  return (await res.json()) as WpMediaItem;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

type ImportCtx = {
  useSupabase: boolean;
  admin: ReturnType<typeof createSupabaseServiceRoleClient>;
  bucket: string;
};

/** Retrouve ou importe une pièce jointe WP comme dans import-wp-media. */
async function ensureWpMediaRow(
  prisma: PrismaClient,
  attachmentId: number,
  ctx: ImportCtx,
): Promise<{ url: string; filename: string; alt: string | null } | null> {
  const prefix = `wp-${attachmentId}-`;
  const existing = await prisma.media.findFirst({
    where: { filename: { startsWith: prefix } },
  });
  if (existing) {
    return { url: existing.url, filename: existing.filename, alt: existing.alt };
  }

  const item = await fetchWpMediaById(attachmentId);
  if (!item || item.media_type !== "image" || !item.source_url?.startsWith("http")) {
    return null;
  }

  const ext = extFromUrl(item.source_url, item.mime_type);
  const base = sanitizeSlug(item.slug || String(item.id));
  const filename = `wp-${item.id}-${base}${ext}`;

  const dup = await prisma.media.findFirst({ where: { filename } });
  if (dup) return { url: dup.url, filename: dup.filename, alt: dup.alt };

  const imgRes = await fetch(item.source_url);
  if (!imgRes.ok) return null;
  const buf = Buffer.from(await imgRes.arrayBuffer());
  if (buf.length === 0) return null;

  const mimeType = item.mime_type || "image/jpeg";
  const alt =
    (item.alt_text && item.alt_text.trim()) ||
    (item.title?.rendered && stripTags(item.title.rendered)) ||
    null;

  let publicUrl: string;
  const { useSupabase, admin, bucket } = ctx;

  if (useSupabase && admin && SUPABASE_IMAGE_MIMES.has(mimeType)) {
    const folder = randomBytes(8).toString("hex");
    const unique = randomBytes(8).toString("hex");
    const { base: storageBase, ext: storageExt } = sanitizeFilename(filename, mimeType);
    const storagePath = `admin-media/${folder}/${storageBase}-${unique}${storageExt}`;
    const { error: upErr } = await admin.storage.from(bucket).upload(storagePath, buf, {
      contentType: mimeType,
      upsert: true,
    });
    if (upErr) {
      console.error(`[supabase] attachment ${attachmentId}: ${upErr.message}`);
      return null;
    }
    const { data: pub } = admin.storage.from(bucket).getPublicUrl(storagePath);
    publicUrl = pub.publicUrl;
  } else {
    await mkdir(OUT_DIR, { recursive: true });
    await writeFile(path.join(OUT_DIR, filename), buf);
    publicUrl = `/uploads/wp-import/${filename}`;
  }

  await prisma.media.create({
    data: {
      url: publicUrl,
      filename,
      mimeType,
      width: item.media_details?.width ?? null,
      height: item.media_details?.height ?? null,
      alt,
    },
  });

  console.log(`[import à la volée] wp-${attachmentId} → ${filename}`);
  return { url: publicUrl, filename, alt };
}

async function main() {
  const prisma = new PrismaClient();
  const useSupabase = !FORCE_LOCAL && hasSupabaseMediaStorageEnv();
  const admin = useSupabase ? createSupabaseServiceRoleClient() : null;
  const bucket = useSupabase ? getMediaStorageBucket() : "";
  const ctx: ImportCtx = { useSupabase, admin, bucket };

  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, slug: true, title: true, coverImageUrl: true, coverImageAlt: true },
  });

  let updated = 0;
  let skippedNoWp = 0;
  let skippedNoFeatured = 0;
  let skippedNoMedia = 0;
  let unchanged = 0;
  let importedOnTheFly = 0;

  for (const a of articles) {
    const wp = await fetchWpPostBySlug(a.slug);
    if (!wp) {
      skippedNoWp += 1;
      continue;
    }

    const fm = wp.featured_media;
    if (!fm || fm <= 0) {
      skippedNoFeatured += 1;
      continue;
    }

    let media = await prisma.media.findFirst({
      where: { filename: { startsWith: `wp-${fm}-` } },
    });

    if (!media) {
      const ensured = await ensureWpMediaRow(prisma, fm, ctx);
      if (!ensured) {
        console.warn(`[échec] slug=${a.slug} featured_media=${fm}`);
        skippedNoMedia += 1;
        continue;
      }
      importedOnTheFly += 1;
      media = await prisma.media.findFirst({ where: { filename: ensured.filename } });
      if (!media) continue;
    }

    const embed = wp._embedded?.["wp:featuredmedia"]?.[0];
    const altFromWp =
      embed?.alt_text?.trim() ||
      (embed?.title?.rendered && stripTags(embed.title.rendered)) ||
      media.alt?.trim() ||
      a.title;

    if (a.coverImageUrl === media.url && a.coverImageAlt === altFromWp) {
      unchanged += 1;
      continue;
    }

    await prisma.article.update({
      where: { id: a.id },
      data: {
        coverImageUrl: media.url,
        coverImageAlt: altFromWp.slice(0, 500),
      },
    });
    updated += 1;
    console.log(`OK ${a.slug} → ${media.filename}`);
  }

  await prisma.$disconnect();
  console.log(
    `Terminé : ${updated} article(s) mis à jour, ${unchanged} déjà alignés, ${importedOnTheFly} média(x) importé(s) à la volée, ${skippedNoWp} sans article WP, ${skippedNoFeatured} sans image à la une WP, ${skippedNoMedia} échec(s) média.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
