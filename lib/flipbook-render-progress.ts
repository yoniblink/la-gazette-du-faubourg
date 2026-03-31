import { prisma } from "@/lib/prisma";
import { HOME_FLIPBOOK_RENDER_PROGRESS_KEY } from "@/lib/site-settings";

export type FlipbookRenderProgress = {
  percent: number;
  message: string;
  phase: "init" | "ilovepdf" | "webp" | "persist" | "done" | "error";
  pdfPageCurrent?: number;
  pdfPagesTotal?: number;
  uploadCurrent?: number;
  uploadsTotal?: number;
  updatedAt: string;
};

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export async function writeFlipbookRenderProgress(
  partial: Omit<FlipbookRenderProgress, "updatedAt"> & { updatedAt?: string },
): Promise<void> {
  const full: FlipbookRenderProgress = {
    ...partial,
    percent: clampPct(partial.percent),
    updatedAt: partial.updatedAt ?? new Date().toISOString(),
  };
  await prisma.siteSetting.upsert({
    where: { key: HOME_FLIPBOOK_RENDER_PROGRESS_KEY },
    create: { key: HOME_FLIPBOOK_RENDER_PROGRESS_KEY, value: JSON.stringify(full) },
    update: { value: JSON.stringify(full) },
  });
}

export async function clearFlipbookRenderProgress(): Promise<void> {
  await prisma.siteSetting.deleteMany({
    where: { key: HOME_FLIPBOOK_RENDER_PROGRESS_KEY },
  });
}

export async function getFlipbookRenderProgress(): Promise<FlipbookRenderProgress | null> {
  const row = await prisma.siteSetting.findUnique({
    where: { key: HOME_FLIPBOOK_RENDER_PROGRESS_KEY },
  });
  if (!row?.value?.trim()) return null;
  try {
    const o = JSON.parse(row.value) as FlipbookRenderProgress;
    if (typeof o.percent !== "number" || typeof o.message !== "string") return null;
    return o;
  } catch {
    return null;
  }
}
