import type { FlipbookManifest } from "@/lib/flipbook-manifest";
import { parseFlipbookManifest } from "@/lib/flipbook-manifest";
import { tryPrisma } from "@/lib/prisma";

export const HOME_FLIPBOOK_PDF_URL_KEY = "home_flipbook_pdf_url";
export const HOME_FLIPBOOK_MANIFEST_KEY = "home_flipbook_manifest_json";

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
