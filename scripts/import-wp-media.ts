/**
 * Télécharge toutes les images de la médiathèque WordPress (REST API)
 * et crée des lignes `Media` Prisma.
 *
 * Si Supabase est configuré (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) :
 *   upload vers le bucket `site-media` (ou MEDIA_STORAGE_BUCKET), chemin `admin-media/{16 hex}/{base}-{16 hex}.ext`
 *   — même convention que `app/api/admin/upload/route.ts`.
 *
 * Sinon (ou IMPORT_WP_MEDIA_LOCAL=1) :
 *   fichiers dans `public/uploads/wp-import/`, URL `/uploads/wp-import/…`
 *
 * Usage :
 *   npx tsx scripts/import-wp-media.ts
 *   npm run import:wp-media
 *
 * Variables (optionnelles) :
 *   WORDPRESS_IMPORT_BASE_URL  (défaut : http://lagazettedufaubourg.local)
 *   IMPORT_WP_MEDIA_LOCAL=1     forcer l’écriture locale même si Supabase est dispo
 *   IMPORT_WP_MEDIA_RESYNC=1    supprimer les Médias dont le filename commence par wp-
 *                               puis tout réimporter (ex. repasser du disque local au bucket)
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
const PER_PAGE = 100;
const OUT_DIR = path.join(process.cwd(), "public", "uploads", "wp-import");

/** Aligné sur l’API admin upload (types autorisés dans le bucket). */
const SUPABASE_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const FORCE_LOCAL = process.env.IMPORT_WP_MEDIA_LOCAL === "1";
const RESYNC = process.env.IMPORT_WP_MEDIA_RESYNC === "1";

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

/** Même logique que `sanitizeFilename` dans `app/api/admin/upload/route.ts`. */
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
  if (mime === "image/avif") return ".avif";
  if (mime === "image/svg+xml") return ".svg";
  return ".bin";
}

async function fetchMediaPage(page: number): Promise<WpMediaItem[]> {
  const u = new URL("/wp-json/wp/v2/media", WP_BASE);
  u.searchParams.set("per_page", String(PER_PAGE));
  u.searchParams.set("page", String(page));
  const res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
  if (res.status === 400 && page > 1) return [];
  if (!res.ok) {
    throw new Error(`WP media page ${page}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as WpMediaItem[];
}

async function main() {
  const prisma = new PrismaClient();

  if (RESYNC) {
    const removed = await prisma.media.deleteMany({
      where: { filename: { startsWith: "wp-" } },
    });
    console.log(`Resync : ${removed.count} entrée(s) Média (import WP) supprimée(s) avant réimport.`);
  }

  const useSupabase = !FORCE_LOCAL && hasSupabaseMediaStorageEnv();

  if (useSupabase) {
    console.log(
      `Mode Supabase : bucket « ${getMediaStorageBucket()} », préfixe admin-media/…`,
    );
  } else {
    await mkdir(OUT_DIR, { recursive: true });
    console.log(
      FORCE_LOCAL
        ? "Mode local forcé (IMPORT_WP_MEDIA_LOCAL=1) → public/uploads/wp-import/"
        : "Supabase non configuré → public/uploads/wp-import/ (définir NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY pour le bucket)",
    );
  }

  let page = 1;
  let total = 0;
  let skipped = 0;
  let errors = 0;

  const admin = useSupabase ? createSupabaseServiceRoleClient() : null;
  const bucket = useSupabase ? getMediaStorageBucket() : "";

  for (;;) {
    const items = await fetchMediaPage(page);
    if (!items.length) break;

    for (const item of items) {
      if (item.media_type !== "image") {
        skipped += 1;
        continue;
      }
      const src = item.source_url;
      if (!src || !src.startsWith("http")) {
        skipped += 1;
        continue;
      }

      const ext = extFromUrl(src, item.mime_type);
      const base = sanitizeSlug(item.slug || String(item.id));
      const filename = `wp-${item.id}-${base}${ext}`;

      const existing = await prisma.media.findFirst({ where: { filename } });
      if (existing) {
        skipped += 1;
        continue;
      }

      try {
        const imgRes = await fetch(src);
        if (!imgRes.ok) {
          console.error(`[skip] ${item.id} fetch ${imgRes.status}: ${src}`);
          errors += 1;
          continue;
        }
        const buf = Buffer.from(await imgRes.arrayBuffer());
        if (buf.length === 0) {
          errors += 1;
          continue;
        }

        const mimeType = item.mime_type || "image/jpeg";
        const alt =
          (item.alt_text && item.alt_text.trim()) ||
          (item.title?.rendered && stripTags(item.title.rendered).trim()) ||
          null;

        let publicUrl: string;

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
            console.error(`[supabase] ${item.id} ${upErr.message}`);
            errors += 1;
            continue;
          }

          const { data: pub } = admin.storage.from(bucket).getPublicUrl(storagePath);
          publicUrl = pub.publicUrl;
        } else if (useSupabase && admin && !SUPABASE_IMAGE_MIMES.has(mimeType)) {
          console.warn(
            `[skip supabase] ${item.id} type ${mimeType} non supporté par l’admin (jpeg/png/webp/gif) → écriture locale`,
          );
          const diskPath = path.join(OUT_DIR, filename);
          await mkdir(OUT_DIR, { recursive: true });
          await writeFile(diskPath, buf);
          publicUrl = `/uploads/wp-import/${filename}`;
        } else {
          const diskPath = path.join(OUT_DIR, filename);
          await writeFile(diskPath, buf);
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
        total += 1;
        if (total % 25 === 0) console.log(`… ${total} importées`);
      } catch (e) {
        console.error(`[err] id ${item.id}`, e);
        errors += 1;
      }
    }

    if (items.length < PER_PAGE) break;
    page += 1;
  }

  await prisma.$disconnect();
  console.log(`Terminé : ${total} nouveau(x) média(x), ${skipped} ignoré(s), ${errors} erreur(s).`);
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
