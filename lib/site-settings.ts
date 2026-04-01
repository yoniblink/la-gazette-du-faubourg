import type { FlipbookManifest } from "@/lib/flipbook-manifest";
import { parseFlipbookManifest } from "@/lib/flipbook-manifest";
import { tryPrisma } from "@/lib/prisma";

export const HOME_FLIPBOOK_PDF_URL_KEY = "home_flipbook_pdf_url";
export const HOME_FLIPBOOK_MANIFEST_KEY = "home_flipbook_manifest_json";
/** Liste des PDF flipbook téléversés (JSON), avec manifest par entrée lorsque généré. */
export const HOME_FLIPBOOK_CATALOG_KEY = "home_flipbook_catalog_json";
/** Progression détaillée du rendu flipbook (JSON), pour l’admin uniquement. */
export const HOME_FLIPBOOK_RENDER_PROGRESS_KEY = "home_flipbook_render_progress_json";
export const MEDIA_KIT_PDF_URL_KEY = "media_kit_pdf_url";

export async function getHomeFlipbookPdfUrl(): Promise<string | null> {
  const db = tryPrisma();
  if (!db) return null;
  const row = await db.siteSetting.findUnique({
    where: { key: HOME_FLIPBOOK_PDF_URL_KEY },
  });
  const v = row?.value?.trim();
  return v || null;
}

export async function getHomeFlipbookManifest(): Promise<FlipbookManifest | null> {
  const db = tryPrisma();
  if (!db) return null;
  const row = await db.siteSetting.findUnique({
    where: { key: HOME_FLIPBOOK_MANIFEST_KEY },
  });
  return parseFlipbookManifest(row?.value);
}

export async function getMediaKitPdfUrl(): Promise<string | null> {
  const db = tryPrisma();
  if (!db) return null;
  const row = await db.siteSetting.findUnique({
    where: { key: MEDIA_KIT_PDF_URL_KEY },
  });
  const v = row?.value?.trim();
  return v || null;
}
