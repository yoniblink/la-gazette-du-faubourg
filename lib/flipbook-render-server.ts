/**
 * Rasterise un PDF en images WebP sur Supabase Storage (Node uniquement).
 * Pipeline basse mémoire : une image à la fois.
 *
 * PDF « une page portrait = une page magazine » : pas de découpe verticale (évite le texte illisible).
 * PDF paysage type « deux pages fusionnées » : découpe au milieu (mode spread).
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

const WEBP_QUALITY = 88;
const WEBP_EFFORT = 3;
const DEFAULT_RENDER_DPR = 1.12;
const DEFAULT_HALF_SPREAD_CSS_PX = 400;
const DEFAULT_MAX_PAGES = 12;

/**
 * pdf.js impose une URL de base se terminant par « / » (slash).
 * Sous Node, les chargements passent par fs.readFile : chemins absolus avec « / ».
 */
function pdfDataBaseUrl(absoluteDir: string): string {
  return `${absoluteDir.replace(/\\/g, "/").replace(/\/?$/, "/")}`;
}

function pdfJsDistDir(): string {
  return path.join(process.cwd(), "node_modules", "pdfjs-dist");
}

/** Paramètres requis côté Node pour polices / CMap / wasm (évite rendu texte en paths → « ratures »). */
function pdfDocumentLoadOptions() {
  const root = pdfJsDistDir();
  const useSystemFonts = process.env.FLIPBOOK_PDF_USE_SYSTEM_FONTS === "true";
  const disableFontFace = process.env.FLIPBOOK_PDF_DISABLE_FONT_FACE === "true";
  return {
    cMapUrl: pdfDataBaseUrl(path.join(root, "cmaps")),
    cMapPacked: true,
    standardFontDataUrl: pdfDataBaseUrl(path.join(root, "standard_fonts")),
    wasmUrl: pdfDataBaseUrl(path.join(root, "wasm")),
    /** false = vraies fontes + fillText ; true (défaut pdf.js en Node) = paths uniquement, souvent illisible sur Skia */
    disableFontFace,
    useSystemFonts,
  };
}

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

async function renderPageToWebpFromPage(
  pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs"),
  page: PdfPage,
  pxSingleColW: number,
  pxSpreadH: number,
): Promise<Buffer> {
  const base = page.getViewport({ scale: 1 });
  const fitScale = Math.min(pxSingleColW / base.width, pxSpreadH / base.height);
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
    .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT, smartSubsample: true })
    .toBuffer();
}

async function renderSpreadToPngFromPage(
  pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs"),
  page: PdfPage,
  pxSpreadW: number,
  pxSpreadH: number,
): Promise<Buffer> {
  const base = page.getViewport({ scale: 1 });
  const fitScale = Math.min(pxSpreadW / base.width, pxSpreadH / base.height);
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
    console.info("[flipbook-render] démarrage", args.pdfStoragePath, "layout=", layout);

    const pdfjs = await loadPdfJs();
    const docOpts = pdfDocumentLoadOptions();

    let pdf: PdfDoc;
    try {
      const loadingTask = pdfjs.getDocument({
        url: args.publicPdfUrl,
        ...docOpts,
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
        ...docOpts,
      });
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
          const buf = await renderPageToWebpFromPage(pdfjs, page, pxSingleColW, pxSpreadH);
          const up = await uploadWebpSlot(admin, args.bucket, slotsDir, slotIndex++, buf);
          if (!up.ok) return up;
          pageUrls.push(up.publicUrl);
          fullSpreadSlot.push(isEdge);
        } else {
          const spreadPng = await renderSpreadToPngFromPage(pdfjs, page, pxSpreadW, pxSpreadH);
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

    console.info("[flipbook-render] terminé", pageUrls.length, "images WebP");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[flipbook-render] échec", e);
    return { ok: false, error: msg };
  }
}
