/**
 * Rasterise un PDF en PNG (sans perte) sur Supabase Storage (Node uniquement).
 * Chargement minimal (getDocument url/data uniquement) : pdf.js applique le fichier tel qu’interprété par le moteur.
 * Sur-échantillon raster puis Sharp → cible (pas de dossiers standard_fonts/cmaps imposés par l’app).
 *
 * Une page portrait ≠ double page : pas de découpe verticale sauf PDF paysage type 2-up.
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

/** 0–9 ; plus haut = fichiers plus petits, encode un peu plus lent. */
const PNG_COMPRESSION_LEVEL = 6;
const DEFAULT_RENDER_DPR = 1.12;
const DEFAULT_HALF_SPREAD_CSS_PX = 400;
const DEFAULT_MAX_PAGES = 12;
/** Raster interne plus grand puis réduction Sharp : meilleure fidélité sans toucher aux polices du PDF. */
const DEFAULT_SUPER_SAMPLE = 2;

type LayoutMode = "auto" | "portrait" | "spread";

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

function superSample(): number {
  const n = parseFloat(process.env.FLIPBOOK_RENDER_SUPER_SAMPLE ?? String(DEFAULT_SUPER_SAMPLE));
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 3) : DEFAULT_SUPER_SAMPLE;
}

function pdfLayoutMode(): LayoutMode {
  const v = (process.env.FLIPBOOK_PDF_LAYOUT ?? "auto").trim().toLowerCase();
  if (v === "spread" || v === "double") return "spread";
  if (v === "portrait" || v === "single") return "portrait";
  return "auto";
}

/**
 * Dimensions intrinsèques (MediaBox / rotation PDF ignorée).
 * Sinon une page portrait avec Rotate=90 apparaît « paysage » et on découpe au milieu → ratures.
 */
function naturalPageDimensions(page: PdfPage): { w: number; h: number } {
  const v = page.getViewport({ scale: 1, rotation: 0 });
  return { w: v.width, h: v.height };
}

/** Une page PDF paysage = probablement deux pages catalogue collées (2-up). */
function isLikelyMergedSpread(pageW: number, pageH: number): boolean {
  return pageW >= pageH * 1.12;
}

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerPath = path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  return pdfjs;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfDoc = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfPage = any;

function pngOutOpts(): { compressionLevel: number; adaptiveFiltering: boolean } {
  const n = parseInt(process.env.FLIPBOOK_RENDER_PNG_LEVEL ?? String(PNG_COMPRESSION_LEVEL), 10);
  const level = Number.isFinite(n) ? Math.min(Math.max(n, 0), 9) : PNG_COMPRESSION_LEVEL;
  return { compressionLevel: level, adaptiveFiltering: true };
}

async function uploadSlotPng(
  admin: SupabaseClient,
  bucket: string,
  slotsDir: string,
  slotIndex: number,
  pngBytes: Buffer,
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  const objectPath = `${slotsDir}/${String(slotIndex).padStart(4, "0")}.png`;
  const { error } = await admin.storage.from(bucket).upload(objectPath, pngBytes, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) {
    return { ok: false, error: `Upload Storage (${objectPath}) : ${error.message}` };
  }
  const { data: pub } = admin.storage.from(bucket).getPublicUrl(objectPath);
  return { ok: true, publicUrl: pub.publicUrl };
}

async function renderPageToSlotPngFromPage(
  pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs"),
  page: PdfPage,
  pxSingleColW: number,
  pxSpreadH: number,
  ss: number,
): Promise<Buffer> {
  const base = page.getViewport({ scale: 1 });
  const fitScale = Math.min(pxSingleColW / base.width, pxSpreadH / base.height) * ss;
  const vp0 = page.getViewport({ scale: fitScale });
  const tw = Math.max(1, Math.round(vp0.width));
  const th = Math.max(1, Math.round(vp0.height));
  const vp = page.getViewport({ scale: fitScale * (tw / vp0.width) });
  const tile = createCanvas(tw, th);
  const tctx = tile.getContext("2d");
  tctx.fillStyle = "#f5f5f4";
  tctx.fillRect(0, 0, tw, th);
  await page
    .render({
      canvasContext: tctx as unknown as CanvasRenderingContext2D,
      viewport: vp,
      canvas: tile as unknown as HTMLCanvasElement,
      annotationMode: pdfjs.AnnotationMode.DISABLE,
      intent: "display",
      background: "#f5f5f4",
    })
    .promise;
  const png = Buffer.from(await tile.encode("png"));
  return sharp(png)
    .resize(pxSingleColW, pxSpreadH, {
      fit: "contain",
      position: "centre",
      background: "#f5f5f4",
      kernel: sharp.kernel.lanczos3,
    })
    .png(pngOutOpts())
    .toBuffer();
}

async function renderSpreadToPngFromPage(
  pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs"),
  page: PdfPage,
  pxSpreadW: number,
  pxSpreadH: number,
  ss: number,
): Promise<Buffer> {
  const base = page.getViewport({ scale: 1 });
  const fitScale = Math.min(pxSpreadW / base.width, pxSpreadH / base.height) * ss;
  const vp0 = page.getViewport({ scale: fitScale });
  const tw = Math.max(1, Math.round(vp0.width));
  const th = Math.max(1, Math.round(vp0.height));
  const vp = page.getViewport({ scale: fitScale * (tw / vp0.width) });
  const tile = createCanvas(tw, th);
  const tctx = tile.getContext("2d");
  tctx.fillStyle = "#f5f5f4";
  tctx.fillRect(0, 0, tw, th);
  await page
    .render({
      canvasContext: tctx as unknown as CanvasRenderingContext2D,
      viewport: vp,
      canvas: tile as unknown as HTMLCanvasElement,
      annotationMode: pdfjs.AnnotationMode.DISABLE,
      intent: "display",
      background: "#f5f5f4",
    })
    .promise;
  const raw = Buffer.from(await tile.encode("png"));
  return sharp(raw)
    .resize(pxSpreadW, pxSpreadH, {
      fit: "contain",
      position: "centre",
      background: "#f5f5f4",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
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

    const layout = pdfLayoutMode();
    const ss = superSample();
    console.info("[flipbook-render] démarrage", args.pdfStoragePath, "layout=", layout, "superSample=", ss);

    const pdfjs = await loadPdfJs();

    let pdf: PdfDoc;
    try {
      const loadingTask = pdfjs.getDocument({ url: args.publicPdfUrl });
      pdf = await loadingTask.promise;
    } catch {
      const res = await fetch(args.publicPdfUrl);
      if (!res.ok) {
        return { ok: false, error: `Téléchargement du PDF refusé (HTTP ${res.status}).` };
      }
      const data = new Uint8Array(await res.arrayBuffer());
      const loadingTask = pdfjs.getDocument({ data });
      pdf = await loadingTask.promise;
    }

    const limit = maxRenderPages();
    const halfW = cssHalfSpreadPx();
    const dpr = renderDpr();
    const totalPdfPages = pdf.numPages;
    const maxPages = Math.min(totalPdfPages, limit);

    const page1 = await pdf.getPage(1);
    /** Même logique que le rendu (rotation PDF incluse) pour que le flipbook garde le bon ratio. */
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
      const page = await pdf.getPage(p);
      try {
        const { w: natW, h: natH } = naturalPageDimensions(page);
        let useVerticalSplit = false;
        if (!isEdge) {
          if (layout === "spread") useVerticalSplit = true;
          else if (layout === "portrait") useVerticalSplit = false;
          else useVerticalSplit = isLikelyMergedSpread(natW, natH);
        }

        if (isEdge || !useVerticalSplit) {
          const buf = await renderPageToSlotPngFromPage(pdfjs, page, pxSingleColW, pxSpreadH, ss);
          const up = await uploadSlotPng(admin, args.bucket, slotsDir, slotIndex++, buf);
          if (!up.ok) return up;
          pageUrls.push(up.publicUrl);
          fullSpreadSlot.push(isEdge);
        } else {
          const spreadPng = await renderSpreadToPngFromPage(pdfjs, page, pxSpreadW, pxSpreadH, ss);
          const mid = Math.floor(pxSpreadW / 2);
          const rightW = pxSpreadW - mid;

          const leftBuf = await sharp(spreadPng)
            .extract({ left: 0, top: 0, width: mid, height: pxSpreadH })
            .png(pngOutOpts())
            .toBuffer();
          let up = await uploadSlotPng(admin, args.bucket, slotsDir, slotIndex++, leftBuf);
          if (!up.ok) return up;
          pageUrls.push(up.publicUrl);
          fullSpreadSlot.push(false);

          const rightBuf = await sharp(spreadPng)
            .extract({ left: mid, top: 0, width: rightW, height: pxSpreadH })
            .png(pngOutOpts())
            .toBuffer();
          up = await uploadSlotPng(admin, args.bucket, slotsDir, slotIndex++, rightBuf);
          if (!up.ok) return up;
          pageUrls.push(up.publicUrl);
          fullSpreadSlot.push(false);
        }
      } finally {
        try {
          page.cleanup?.();
        } catch {
          /* ignore */
        }
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

    console.info("[flipbook-render] terminé", pageUrls.length, "PNG");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[flipbook-render] échec", e);
    return { ok: false, error: msg };
  }
}
