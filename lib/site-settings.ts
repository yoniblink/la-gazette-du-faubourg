import { tryPrisma } from "@/lib/prisma";

export const HOME_FLIPBOOK_PDF_URL_KEY = "home_flipbook_pdf_url";

export async function getHomeFlipbookPdfUrl(): Promise<string | null> {
  const db = tryPrisma();
  if (!db) return null;
  const row = await db.siteSetting.findUnique({
    where: { key: HOME_FLIPBOOK_PDF_URL_KEY },
  });
  const v = row?.value?.trim();
  return v || null;
}
