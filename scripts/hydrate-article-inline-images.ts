/**
 * Télécharge les images référencées dans le JSON TipTap d’un article (URLs WP)
 * et les téléverse sur Supabase, puis met à jour les `src` en base.
 *
 * À lancer avec WordPress local joignable (mêmes chemins /wp-content/uploads/…).
 *
 * Usage :
 *   HYDRATE_ARTICLE_SLUG=grand-lady-kalla npx tsx scripts/hydrate-article-inline-images.ts
 *
 * WORDPRESS_IMPORT_BASE_URL (défaut : http://lagazettedufaubourg.local) — origine pour le fetch
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
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
const SLUG = (process.env.HYDRATE_ARTICLE_SLUG ?? "grand-lady-kalla").trim();

const SUPABASE_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function collectImageSrcs(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== "object") return;
  const n = node as { type?: string; attrs?: { src?: string }; content?: unknown[] };
  if (n.type === "image" && typeof n.attrs?.src === "string") {
    const s = n.attrs.src.trim();
    if (!s || s.includes("supabase.co")) return;
    if (s.includes("/wp-content/") || s.includes("lagazettedufaubourg")) out.add(s);
  }
  if (Array.isArray(n.content)) {
    for (const c of n.content) collectImageSrcs(c, out);
  }
}

function rewriteNode(node: unknown, map: Map<string, string>): void {
  if (!node || typeof node !== "object") return;
  const n = node as { type?: string; attrs?: { src?: string }; content?: unknown[] };
  if (n.type === "image" && n.attrs && typeof n.attrs.src === "string") {
    const rep = map.get(n.attrs.src);
    if (rep) n.attrs.src = rep;
  }
  if (Array.isArray(n.content)) {
    for (const c of n.content) rewriteNode(c, map);
  }
}

function wpFetchUrl(original: string): string {
  try {
    const u = new URL(original);
    return `${WP_BASE}${u.pathname}${u.search || ""}`;
  } catch {
    return original;
  }
}

async function main() {
  if (!hasSupabaseMediaStorageEnv()) {
    console.error(
      "Supabase média non configuré : NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY",
    );
    process.exit(1);
  }
  const admin = createSupabaseServiceRoleClient();
  if (!admin) process.exit(1);
  const bucket = getMediaStorageBucket();
  const prisma = new PrismaClient();

  const article = await prisma.article.findFirst({ where: { slug: SLUG } });
  if (!article) {
    console.error(`Article introuvable : ${SLUG}`);
    process.exit(1);
  }

  const content = article.content as unknown;
  const srcs = new Set<string>();
  collectImageSrcs(content, srcs);

  console.log(`${srcs.size} URL(s) d’image à traiter (${SLUG})`);

  const map = new Map<string, string>();
  for (const src of srcs) {
    const fetchUrl = wpFetchUrl(src);
    const res = await fetch(fetchUrl);
    if (!res.ok) {
      console.warn(`[skip] ${fetchUrl} → ${res.status}`);
      continue;
    }
    const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    if (!SUPABASE_IMAGE_MIMES.has(mime)) {
      console.warn(`[skip] MIME ${mime} — ${fetchUrl}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) continue;

    let pathname: string;
    try {
      pathname = new URL(src).pathname;
    } catch {
      pathname = "/image.jpg";
    }
    const rawBase = path.basename(pathname) || "image.jpg";
    const ext = path.extname(rawBase) || (mime === "image/png" ? ".png" : ".jpg");
    const base = path.basename(rawBase, path.extname(rawBase)).replace(/[^\w.\-]+/g, "_").slice(0, 50) || "img";
    const folder = randomBytes(8).toString("hex");
    const unique = randomBytes(8).toString("hex");
    const storagePath = `admin-media/${folder}/${base}-${unique}${ext}`;

    const { error: upErr } = await admin.storage.from(bucket).upload(storagePath, buf, {
      contentType: mime,
      upsert: true,
    });
    if (upErr) {
      console.warn(`[skip] upload ${upErr.message}`);
      continue;
    }
    const { data: pub } = admin.storage.from(bucket).getPublicUrl(storagePath);
    map.set(src, pub.publicUrl);
    console.log(`OK ${rawBase}`);
  }

  rewriteNode(content, map);

  await prisma.article.update({
    where: { id: article.id },
    data: { content: content as object },
  });

  await prisma.$disconnect();
  console.log(`Terminé : ${map.size} image(s) → Supabase, article mis à jour.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
