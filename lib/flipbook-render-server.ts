/**
 * Rasterise un PDF en images WebP sur Supabase Storage (Node uniquement).
 * Appelé après l’upload admin via `after()` pour ne pas bloquer la réponse HTTP.
 */
import { createCanvas } from "@napi-rs/canvas";
import path from "path";
import { pathToFileURL } from "url";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import type { FlipbookManifest } from "@/lib/flipbook-manifest";
import { serializeFlipbookManifest } from "@/lib/flipbook-manifest";
import { prisma } from "@/lib/prisma";
import { HOME_FLIPBOOK_MANIFEST_KEY } from "@/lib/site-settings";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-service";

const WEBP_QUALITY = 82;
const RASTER_DPR_CAP = 1.25;
const DEFAULT_MAX_PAGES = 60;
const DEFAULT_HALF_SPREAD_CSS_PX = 480;

function maxRenderPages(): number {
  const n = parseInt(process.env.FLIPBOOK_RENDER_MAX_PAGES ?? String(DEFAULT_MAX_PAGES), 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 200) : DEFAULT_MAX_PAGES;
}

function cssHalfSpreadPx(): number {
  const n = parseInt(process.env.FLIPBOOK_RENDER_HALF_SPREAD_PX ?? String(DEFAULT_HALF_SPREAD_CSS_PX), 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 200), 900) : DEFAULT_HALF_SPREAD_CSS_PX;
}

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerPath = path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  return pdfjs;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfDoc = any;

async function renderPageToWebpBuffer(
  pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs"),
  pdf: PdfDoc,
  pageNum: number,
  pxSingleColW: number,
  pxSpreadW: number,
  pxSpreadH: number,
): Promise<Buffer> {
  const page = await pdf.getPage(pageNum);
  const base = page.getViewport({ scale: 1 });
  const fitScale = Math.min(pxSingleColW / base.width, pxSpreadH / base.height);
  const vp = page.getViewport({ scale: fitScale });
  const c = createCanvas(pxSingleColW, pxSpreadH);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f5f5f4";
  ctx.fillRect(0, 0, pxSingleColW, pxSpreadH);
  const tile = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
  const tctx = tile.getContext("2d");
  await page
    .render({
      canvasContext: tctx as unknown as CanvasRenderingContext2D,
      viewport: vp,
      canvas: tile as unknown as HTMLCanvasElement,
      annotationMode: pdfjs.AnnotationMode.DISABLE,
    })
    .promise;
  ctx.drawImage(tile as unknown as import("@napi-rs/canvas").Canvas, (pxSingleColW - vp.width) / 2, (pxSpreadH - vp.height) / 2);
  const png = await c.encode("png");
  return sharp(png).webp({ quality: WEBP_QUALITY, effort: 4 }).toBuffer();
}

/** Génère les buffers + métadonnées (même logique couverture / double-page que le client historique). */
async function buildSlotBuffers(
  pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs"),
  pdf: PdfDoc,
  numPages: number,
  cssHalfSpreadWidthPx: number,
): Promise<{
  buffers: Buffer[];
  fullSpreadSlot: boolean[];
  pageW: number;
  pageH: number;
  totalPdfPages: number;
  renderedPdfPages: number;
}> {
  const totalPdfPages = pdf.numPages;
  const maxPages = Math.min(totalPdfPages, numPages);
  const page1 = await pdf.getPage(1);
  const refBase = page1.getViewport({ scale: 1 });
  const dpr = RASTER_DPR_CAP;
  const cssPageH = cssHalfSpreadWidthPx * (refBase.height / refBase.width);
  const pxSpreadW = Math.round(2 * cssHalfSpreadWidthPx * dpr);
  const pxSpreadH = Math.round(cssPageH * dpr);
  const pxSingleColW = Math.round(cssHalfSpreadWidthPx * dpr);

  const buffers: Buffer[] = [];
  const fullSpreadSlot: boolean[] = [];

  for (let p = 1; p <= maxPages; p++) {
    const isEdge = p === 1 || p === maxPages;
    if (isEdge) {
      buffers.push(await renderPageToWebpBuffer(pdfjs, pdf, p, pxSingleColW, pxSpreadW, pxSpreadH));
      fullSpreadSlot.push(true);
      continue;
    }
    const spreadPng = await renderSpreadToPngBuffer(pdfjs, pdf, p, pxSpreadW, pxSpreadH);
    const mid = Math.floor(pxSpreadW / 2);
    const rightW = pxSpreadW - mid;
    const [leftBuf, rightBuf] = await Promise.all([
      sharp(spreadPng).extract({ left: 0, top: 0, width: mid, height: pxSpreadH }).webp({ quality: WEBP_QUALITY }).toBuffer(),
      sharp(spreadPng)
        .extract({ left: mid, top: 0, width: rightW, height: pxSpreadH })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer(),
    ]);
    buffers.push(leftBuf, rightBuf);
    fullSpreadSlot.push(false, false);
  }

  if (buffers.length === 1) {
    buffers.push(buffers[0]);
    fullSpreadSlot.push(fullSpreadSlot[0]);
  }

  return {
    buffers,
    fullSpreadSlot,
    pageW: cssHalfSpreadWidthPx,
    pageH: cssPageH,
    totalPdfPages,
    renderedPdfPages: maxPages,
  };
}

/** Pixels PNG intermédiaire (split spread) — évite double passage sharp sur le même canvas */
async function renderSpreadToPngBuffer(
  pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs"),
  pdf: PdfDoc,
  pageNum: number,
  pxSpreadW: number,
  pxSpreadH: number,
): Promise<Buffer> {
  const page = await pdf.getPage(pageNum);
  const base = page.getViewport({ scale: 1 });
  const fitScale = Math.min(pxSpreadW / base.width, pxSpreadH / base.height);
  const vp = page.getViewport({ scale: fitScale });
  const spread = createCanvas(pxSpreadW, pxSpreadH);
  const sctx = spread.getContext("2d");
  sctx.fillStyle = "#f5f5f4";
  sctx.fillRect(0, 0, pxSpreadW, pxSpreadH);
  const tile = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
  const tctx = tile.getContext("2d");
  await page
    .render({
      canvasContext: tctx as unknown as CanvasRenderingContext2D,
      viewport: vp,
      canvas: tile as unknown as HTMLCanvasElement,
      annotationMode: pdfjs.AnnotationMode.DISABLE,
    })
    .promise;
  sctx.drawImage(tile as unknown as import("@napi-rs/canvas").Canvas, (pxSpreadW - vp.width) / 2, (pxSpreadH - vp.height) / 2);
  return Buffer.from(await spread.encode("png"));
}

export async function renderFlipbookPdfToStorageAndPersist(args: {
  publicPdfUrl: string;
  pdfStoragePath: string;
  bucket: string;
}): Promise<void> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    console.error("[flipbook-render] pas de client service role");
    return;
  }

  const pdfjs = await loadPdfJs();
  const res = await fetch(args.publicPdfUrl);
  if (!res.ok) {
    console.error("[flipbook-render] fetch PDF", res.status);
    return;
  }
  const data = new Uint8Array(await res.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;

  const limit = maxRenderPages();
  const halfW = cssHalfSpreadPx();
  const { buffers, fullSpreadSlot, pageW, pageH, totalPdfPages, renderedPdfPages } =
    await buildSlotBuffers(pdfjs, pdf, limit, halfW);

  const dir = path.posix.dirname(args.pdfStoragePath);
  const slotsDir = `${dir}/slots`;

  const pageUrls: string[] = [];
  for (let i = 0; i < buffers.length; i++) {
    const objectPath = `${slotsDir}/${String(i).padStart(4, "0")}.webp`;
    const { error } = await admin.storage.from(args.bucket).upload(objectPath, buffers[i], {
      contentType: "image/webp",
      upsert: true,
    });
    if (error) {
      console.error("[flipbook-render] upload", objectPath, error.message);
      return;
    }
    const { data: pub } = admin.storage.from(args.bucket).getPublicUrl(objectPath);
    pageUrls.push(pub.publicUrl);
  }

  try {
    const d = pdf.destroy?.();
    if (d && typeof (d as Promise<void>).then === "function") await d;
  } catch {
    /* ignore */
  }

  const manifest: FlipbookManifest = {
    v: 1,
    pageUrls,
    fullSpreadSlot,
    pageW: Math.round(pageW),
    pageH: Math.round(pageH),
    totalPdfPages,
    renderedPdfPages,
  };

  await prisma.siteSetting.upsert({
    where: { key: HOME_FLIPBOOK_MANIFEST_KEY },
    create: { key: HOME_FLIPBOOK_MANIFEST_KEY, value: serializeFlipbookManifest(manifest) },
    update: { value: serializeFlipbookManifest(manifest) },
  });

  try {
    revalidatePath("/");
  } catch {
    /* en dehors d’une requête Next, ignorer */
  }

  console.info("[flipbook-render] terminé", pageUrls.length, "slots");
}
