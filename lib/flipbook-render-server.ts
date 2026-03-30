/**
 * Rasterise un PDF en images WebP sur Supabase Storage (Node uniquement).
 * Pipeline basse mémoire : une image à la fois (pas de tableau de buffers).
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
import type { SupabaseClient } from "@supabase/supabase-js";

const WEBP_QUALITY = 82;
/** effort Sharp plus bas = moins de mémoire (défaut 4 → 2). */
const WEBP_EFFORT = 2;
/** 1.0 = moins de pixels qu’à 1.25 ; surcharger FLIPBOOK_RENDER_DPR. */
const DEFAULT_RENDER_DPR = 1;
/** Demi-largeur CSS ; plus bas = moins de RAM (défaut 360 au lieu de 480). */
const DEFAULT_HALF_SPREAD_CSS_PX = 360;
const DEFAULT_MAX_PAGES = 12;

export type FlipbookRenderResult = { ok: true } | { ok: false; error: string };

function maxRenderPages(): number {
  const n = parseInt(process.env.FLIPBOOK_RENDER_MAX_PAGES ?? String(DEFAULT_MAX_PAGES), 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 200) : DEFAULT_MAX_PAGES;
}

function cssHalfSpreadPx(): number {
  const n = parseInt(
    process.env.FLIPBOOK_RENDER_HALF_SPREAD_PX ?? String(DEFAULT_HALF_SPREAD_CSS_PX),
    10,
  );
  return Number.isFinite(n) ? Math.min(Math.max(n, 160), 900) : DEFAULT_HALF_SPREAD_CSS_PX;
}

function renderDpr(): number {
  const n = parseFloat(process.env.FLIPBOOK_RENDER_DPR ?? String(DEFAULT_RENDER_DPR));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0.75), 1.5) : DEFAULT_RENDER_DPR;
}

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerPath = path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  return pdfjs;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfDoc = any;

async function uploadWebpSlot(
  admin: SupabaseClient,
  bucket: string,
  slotsDir: string,
  slotIndex: number,
  webp: Buffer,
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  const objectPath = `${slotsDir}/${String(slotIndex).padStart(4, "0")}.webp`;
  const { error } = await admin.storage.from(bucket).upload(objectPath, webp, {
    contentType: "image/webp",
    upsert: true,
  });
  if (error) {
    return { ok: false, error: `Upload Storage (${objectPath}) : ${error.message}` };
  }
  const { data: pub } = admin.storage.from(bucket).getPublicUrl(objectPath);
  return { ok: true, publicUrl: pub.publicUrl };
}

async function renderPageToWebpBuffer(
  pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs"),
  pdf: PdfDoc,
  pageNum: number,
  pxSingleColW: number,
  pxSpreadW: number,
  pxSpreadH: number,
): Promise<Buffer> {
  const page = await pdf.getPage(pageNum);
  try {
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
    ctx.drawImage(
      tile as unknown as import("@napi-rs/canvas").Canvas,
      (pxSingleColW - vp.width) / 2,
      (pxSpreadH - vp.height) / 2,
    );
    const png = await c.encode("png");
    return sharp(png).webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT }).toBuffer();
  } finally {
    try {
      page.cleanup?.();
    } catch {
      /* ignore */
    }
  }
}

async function renderSpreadToPngBuffer(
  pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs"),
  pdf: PdfDoc,
  pageNum: number,
  pxSpreadW: number,
  pxSpreadH: number,
): Promise<Buffer> {
  const page = await pdf.getPage(pageNum);
  try {
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
    sctx.drawImage(
      tile as unknown as import("@napi-rs/canvas").Canvas,
      (pxSpreadW - vp.width) / 2,
      (pxSpreadH - vp.height) / 2,
    );
    return Buffer.from(await spread.encode("png"));
  } finally {
    try {
      page.cleanup?.();
    } catch {
      /* ignore */
    }
  }
}

export async function renderFlipbookPdfToStorageAndPersist(args: {
  publicPdfUrl: string;
  pdfStoragePath: string;
  bucket: string;
}): Promise<FlipbookRenderResult> {
  try {
    const admin = createSupabaseServiceRoleClient();
    if (!admin) {
      return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY manquant ou URL Supabase absente." };
    }

    console.info("[flipbook-render] démarrage (pipeline basse mémoire)", args.pdfStoragePath);

    const pdfjs = await loadPdfJs();

    let pdf: PdfDoc;
    try {
      const loadingTask = pdfjs.getDocument({
        url: args.publicPdfUrl,
        useSystemFonts: true,
      });
      pdf = await loadingTask.promise;
    } catch {
      const res = await fetch(args.publicPdfUrl);
      if (!res.ok) {
        return { ok: false, error: `Téléchargement du PDF refusé (HTTP ${res.status}).` };
      }
      const data = new Uint8Array(await res.arrayBuffer());
      const loadingTask = pdfjs.getDocument({
        data,
        useSystemFonts: true,
      });
      pdf = await loadingTask.promise;
    }

    const limit = maxRenderPages();
    const halfW = cssHalfSpreadPx();
    const dpr = renderDpr();
    const totalPdfPages = pdf.numPages;
    const maxPages = Math.min(totalPdfPages, limit);

    const page1 = await pdf.getPage(1);
    const refBase = page1.getViewport({ scale: 1 });
    try {
      page1.cleanup?.();
    } catch {
      /* ignore */
    }
    const cssPageH = halfW * (refBase.height / refBase.width);
    const pxSpreadW = Math.round(2 * halfW * dpr);
    const pxSpreadH = Math.round(cssPageH * dpr);
    const pxSingleColW = Math.round(halfW * dpr);

    const dir = path.posix.dirname(args.pdfStoragePath);
    const slotsDir = `${dir}/slots`;

    const pageUrls: string[] = [];
    const fullSpreadSlot: boolean[] = [];
    let slotIndex = 0;

    for (let p = 1; p <= maxPages; p++) {
      const isEdge = p === 1 || p === maxPages;
      if (isEdge) {
        const buf = await renderPageToWebpBuffer(pdfjs, pdf, p, pxSingleColW, pxSpreadW, pxSpreadH);
        const up = await uploadWebpSlot(admin, args.bucket, slotsDir, slotIndex++, buf);
        if (!up.ok) return up;
        pageUrls.push(up.publicUrl);
        fullSpreadSlot.push(true);
      } else {
        const spreadPng = await renderSpreadToPngBuffer(pdfjs, pdf, p, pxSpreadW, pxSpreadH);
        const mid = Math.floor(pxSpreadW / 2);
        const rightW = pxSpreadW - mid;

        const leftBuf = await sharp(spreadPng)
          .extract({ left: 0, top: 0, width: mid, height: pxSpreadH })
          .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
          .toBuffer();
        let up = await uploadWebpSlot(admin, args.bucket, slotsDir, slotIndex++, leftBuf);
        if (!up.ok) return up;
        pageUrls.push(up.publicUrl);
        fullSpreadSlot.push(false);

        const rightBuf = await sharp(spreadPng)
          .extract({ left: mid, top: 0, width: rightW, height: pxSpreadH })
          .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
          .toBuffer();
        up = await uploadWebpSlot(admin, args.bucket, slotsDir, slotIndex++, rightBuf);
        if (!up.ok) return up;
        pageUrls.push(up.publicUrl);
        fullSpreadSlot.push(false);
      }
    }

    if (pageUrls.length === 1) {
      pageUrls.push(pageUrls[0]!);
      fullSpreadSlot.push(fullSpreadSlot[0] ?? true);
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
      pageW: Math.round(halfW),
      pageH: Math.round(cssPageH),
      totalPdfPages,
      renderedPdfPages: maxPages,
    };

    await prisma.siteSetting.upsert({
      where: { key: HOME_FLIPBOOK_MANIFEST_KEY },
      create: { key: HOME_FLIPBOOK_MANIFEST_KEY, value: serializeFlipbookManifest(manifest) },
      update: { value: serializeFlipbookManifest(manifest) },
    });

    try {
      revalidatePath("/");
    } catch {
      /* hors requête Next */
    }

    console.info("[flipbook-render] terminé", pageUrls.length, "images WebP");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[flipbook-render] échec", e);
    return { ok: false, error: msg };
  }
}
