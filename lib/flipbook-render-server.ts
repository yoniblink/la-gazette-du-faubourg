/**
 * Flipbook : PDF → WebP dans Storage via l’API iLovePDF (outil pdfjpg), puis Sharp + upload Supabase slots/.
 * Plus de rendu local (pdf.js / Chromium).
 */
import ILovePDFApi from "@ilovepdf/ilovepdf-nodejs";
import path from "path";
import sharp from "sharp";
import unzipper from "unzipper";
import { revalidatePath } from "next/cache";
import type { FlipbookManifest } from "@/lib/flipbook-manifest";
import { serializeFlipbookManifest } from "@/lib/flipbook-manifest";
import { prisma } from "@/lib/prisma";
import { updateFlipbookCatalogManifest } from "@/lib/flipbook-catalog";
import {
  clearFlipbookRenderProgress,
  writeFlipbookRenderProgress,
} from "@/lib/flipbook-render-progress";
import { HOME_FLIPBOOK_MANIFEST_KEY } from "@/lib/site-settings";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-service";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FLIPBOOK_DEFAULT_HALF_SPREAD_CSS_PX,
  FLIPBOOK_DEFAULT_ILOVEPDF_DPI,
  FLIPBOOK_DEFAULT_MAX_PAGES,
  FLIPBOOK_DEFAULT_RENDER_DPR,
  FLIPBOOK_DEFAULT_WEBP_QUALITY,
  FLIPBOOK_MAX_PAGES_CAP,
} from "@/lib/flipbook-config";

const DEFAULT_WEBP_EFFORT = 4;

type LayoutMode = "auto" | "portrait" | "spread";

export type FlipbookRenderResult = { ok: true } | { ok: false; error: string };

export function hasILovePdfCredentials(): boolean {
  return Boolean(
    process.env.ILOVEPDF_PUBLIC_KEY?.trim() && process.env.ILOVEPDF_SECRET_KEY?.trim(),
  );
}

function maxRenderPages(): number {
  const n = parseInt(
    process.env.FLIPBOOK_RENDER_MAX_PAGES ?? String(FLIPBOOK_DEFAULT_MAX_PAGES),
    10,
  );
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), FLIPBOOK_MAX_PAGES_CAP) : FLIPBOOK_DEFAULT_MAX_PAGES;
}

function cssHalfSpreadPx(): number {
  const n = parseInt(
    process.env.FLIPBOOK_RENDER_HALF_SPREAD_PX ?? String(FLIPBOOK_DEFAULT_HALF_SPREAD_CSS_PX),
    10,
  );
  return Number.isFinite(n)
    ? Math.min(Math.max(n, 160), 900)
    : FLIPBOOK_DEFAULT_HALF_SPREAD_CSS_PX;
}

function renderDpr(): number {
  const n = parseFloat(process.env.FLIPBOOK_RENDER_DPR ?? String(FLIPBOOK_DEFAULT_RENDER_DPR));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0.75), 4) : FLIPBOOK_DEFAULT_RENDER_DPR;
}

function ilovePdfDpi(): number {
  const n = parseInt(
    process.env.FLIPBOOK_ILOVEPDF_DPI ?? String(FLIPBOOK_DEFAULT_ILOVEPDF_DPI),
    10,
  );
  return Number.isFinite(n) ? Math.min(Math.max(n, 96), 300) : FLIPBOOK_DEFAULT_ILOVEPDF_DPI;
}

function pdfLayoutMode(): LayoutMode {
  const v = (process.env.FLIPBOOK_PDF_LAYOUT ?? "auto").trim().toLowerCase();
  if (v === "spread" || v === "double") return "spread";
  if (v === "portrait" || v === "single") return "portrait";
  return "auto";
}

function webpOutOpts(): { quality: number; effort: number } {
  const q = parseInt(
    process.env.FLIPBOOK_RENDER_WEBP_QUALITY ?? String(FLIPBOOK_DEFAULT_WEBP_QUALITY),
    10,
  );
  const quality = Number.isFinite(q) ? Math.min(Math.max(q, 50), 100) : FLIPBOOK_DEFAULT_WEBP_QUALITY;
  const e = parseInt(process.env.FLIPBOOK_RENDER_WEBP_EFFORT ?? String(DEFAULT_WEBP_EFFORT), 10);
  const effort = Number.isFinite(e) ? Math.min(Math.max(e, 0), 6) : DEFAULT_WEBP_EFFORT;
  return { quality, effort };
}

function isLikelyMergedSpread(pageW: number, pageH: number): boolean {
  return pageW >= pageH * 1.12;
}

/** Nombre d’envois WebP réels (une page PDF peut produire 2 demi-planches). */
async function countExpectedUploads(
  pages: Buffer[],
  maxPages: number,
  layout: LayoutMode,
): Promise<number> {
  let n = 0;
  for (let i = 0; i < pages.length; i++) {
    const p = i + 1;
    const isEdge = p === 1 || p === maxPages;
    const jpegBuf = pages[i]!;
    const nat = await sharp(jpegBuf).metadata();
    const natW = nat.width ?? 1;
    const natH = nat.height ?? 1;
    let useVerticalSplit = false;
    if (!isEdge) {
      if (layout === "spread") useVerticalSplit = true;
      else if (layout === "portrait") useVerticalSplit = false;
      else useVerticalSplit = isLikelyMergedSpread(natW, natH);
    }
    if (isEdge || !useVerticalSplit) n += 1;
    else n += 2;
  }
  return Math.max(1, n);
}

function webpPhasePercent(doneUploads: number, totalUploads: number): number {
  if (totalUploads <= 0) return 28;
  return Math.min(91, 28 + Math.round((doneUploads / totalUploads) * 63));
}

async function extractJpegsFromZip(zipBuffer: Buffer): Promise<Buffer[]> {
  const directory = await unzipper.Open.buffer(zipBuffer);
  const items: { path: string; data: Buffer }[] = [];
  for (const file of directory.files) {
    if (file.type === "Directory") continue;
    const p = file.path.toLowerCase();
    if (!p.endsWith(".jpg") && !p.endsWith(".jpeg")) continue;
    const buf = await file.buffer();
    items.push({ path: file.path, data: Buffer.from(buf) });
  }
  if (items.length === 0) {
    throw new Error("Zip iLovePDF : aucun fichier JPEG trouvé.");
  }
  items.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
  return items.map((i) => i.data);
}

async function ilovePdfPdfToJpegZip(publicPdfUrl: string): Promise<Buffer> {
  const publicKey = process.env.ILOVEPDF_PUBLIC_KEY?.trim();
  const secretKey = process.env.ILOVEPDF_SECRET_KEY?.trim();
  if (!publicKey || !secretKey) {
    throw new Error("ILOVEPDF_PUBLIC_KEY et ILOVEPDF_SECRET_KEY requis.");
  }

  const instance = new ILovePDFApi(publicKey, secretKey);
  const task = instance.newTask("pdfjpg");
  await task.start();
  await task.addFile(publicPdfUrl);
  await task.process({ pdfjpg_mode: "pages", dpi: ilovePdfDpi() });
  const data = await task.download();
  return Buffer.from(data);
}

async function uploadSlotWebp(
  admin: SupabaseClient,
  bucket: string,
  slotsDir: string,
  slotIndex: number,
  webpBytes: Buffer,
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  const objectPath = `${slotsDir}/${String(slotIndex).padStart(4, "0")}.webp`;
  const { error } = await admin.storage.from(bucket).upload(objectPath, webpBytes, {
    contentType: "image/webp",
    upsert: true,
  });
  if (error) {
    return { ok: false, error: `Upload Storage (${objectPath}) : ${error.message}` };
  }
  const { data: pub } = admin.storage.from(bucket).getPublicUrl(objectPath);
  return { ok: true, publicUrl: pub.publicUrl };
}

async function jpegToTargetWebp(jpeg: Buffer, targetW: number, targetH: number): Promise<Buffer> {
  return sharp(jpeg)
    .resize(targetW, targetH, {
      fit: "contain",
      position: "centre",
      background: "#f5f5f4",
      kernel: sharp.kernel.lanczos3,
    })
    .webp(webpOutOpts())
    .toBuffer();
}

export async function renderFlipbookPdfToStorageAndPersist(args: {
  publicPdfUrl: string;
  pdfStoragePath: string;
  bucket: string;
}): Promise<FlipbookRenderResult> {
  await clearFlipbookRenderProgress();
  try {
    const admin = createSupabaseServiceRoleClient();
    if (!admin) {
      await writeFlipbookRenderProgress({
        percent: 0,
        phase: "error",
        message: "SUPABASE_SERVICE_ROLE_KEY manquant ou URL Supabase absente.",
      });
      return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY manquant ou URL Supabase absente." };
    }
    if (!hasILovePdfCredentials()) {
      const err =
        "Clés iLovePDF manquantes : définissez ILOVEPDF_PUBLIC_KEY et ILOVEPDF_SECRET_KEY (https://developer.ilovepdf.com).";
      await writeFlipbookRenderProgress({ percent: 0, phase: "error", message: err });
      return { ok: false, error: err };
    }

    await writeFlipbookRenderProgress({
      percent: 2,
      phase: "init",
      message: "Préparation : connexion au stockage et paramètres de rendu…",
    });

    const layout = pdfLayoutMode();
    console.info(
      "[flipbook-render] iLovePDF pdfjpg",
      args.pdfStoragePath,
      "layout=",
      layout,
      "dpi=",
      ilovePdfDpi(),
      "dpr=",
      renderDpr(),
      "halfSpreadWx=",
      cssHalfSpreadPx(),
    );

    await writeFlipbookRenderProgress({
      percent: 10,
      phase: "ilovepdf",
      message:
        "Conversion du PDF en JPEG (iLovePDF — traitement de toutes les pages du document sur leurs serveurs)…",
    });

    const zipBuf = await ilovePdfPdfToJpegZip(args.publicPdfUrl);
    const allJpegs = await extractJpegsFromZip(zipBuf);
    const totalPdfPages = allJpegs.length;
    const limit = maxRenderPages();
    const maxPages = Math.min(totalPdfPages, limit);
    const pages = allJpegs.slice(0, maxPages);

    await writeFlipbookRenderProgress({
      percent: 26,
      phase: "ilovepdf",
      message: `JPEG reçus : ${totalPdfPages} page(s) dans le PDF ; ${maxPages} page(s) seront rendues (plafond serveur). Extraction terminée.`,
      pdfPagesTotal: maxPages,
    });

    const halfW = cssHalfSpreadPx();
    const dpr = renderDpr();
    const meta0 = await sharp(pages[0]).metadata();
    const pw = meta0.width ?? 1;
    const ph = meta0.height ?? 1;
    const cssPageH = halfW * (ph / pw);
    const pxSpreadW = Math.round(2 * halfW * dpr);
    const pxSpreadH = Math.round(cssPageH * dpr);
    const pxSingleColW = Math.round(halfW * dpr);

    const dir = path.posix.dirname(args.pdfStoragePath);
    const slotsDir = `${dir}/slots`;

    const totalUploads = await countExpectedUploads(pages, maxPages, layout);
    let doneUploads = 0;

    const pageUrls: string[] = [];
    const fullSpreadSlot: boolean[] = [];
    let slotIndex = 0;

    for (let i = 0; i < pages.length; i++) {
      const p = i + 1;
      const isEdge = p === 1 || p === maxPages;
      const jpegBuf = pages[i]!;
      const nat = await sharp(jpegBuf).metadata();
      const natW = nat.width ?? 1;
      const natH = nat.height ?? 1;

      let useVerticalSplit = false;
      if (!isEdge) {
        if (layout === "spread") useVerticalSplit = true;
        else if (layout === "portrait") useVerticalSplit = false;
        else useVerticalSplit = isLikelyMergedSpread(natW, natH);
      }

      if (isEdge || !useVerticalSplit) {
        await writeFlipbookRenderProgress({
          percent: webpPhasePercent(doneUploads, totalUploads),
          phase: "webp",
          message: `Page PDF ${p}/${maxPages} : conversion JPEG → WebP (une planche), envoi ${doneUploads + 1}/${totalUploads}…`,
          pdfPageCurrent: p,
          pdfPagesTotal: maxPages,
          uploadCurrent: doneUploads + 1,
          uploadsTotal: totalUploads,
        });
        const buf = await jpegToTargetWebp(jpegBuf, pxSingleColW, pxSpreadH);
        const up = await uploadSlotWebp(admin, args.bucket, slotsDir, slotIndex++, buf);
        if (!up.ok) {
          await writeFlipbookRenderProgress({
            percent: 0,
            phase: "error",
            message: `Échec envoi WebP (page ${p}) : ${up.error}`,
          });
          return up;
        }
        doneUploads++;
        pageUrls.push(up.publicUrl);
        fullSpreadSlot.push(isEdge);
      } else {
        await writeFlipbookRenderProgress({
          percent: webpPhasePercent(doneUploads, totalUploads),
          phase: "webp",
          message: `Page PDF ${p}/${maxPages} : planche double — moitié gauche, JPEG → WebP (${doneUploads + 1}/${totalUploads})…`,
          pdfPageCurrent: p,
          pdfPagesTotal: maxPages,
          uploadCurrent: doneUploads + 1,
          uploadsTotal: totalUploads,
        });
        const spread = sharp(jpegBuf).resize(pxSpreadW, pxSpreadH, {
          fit: "contain",
          position: "centre",
          background: "#f5f5f4",
          kernel: sharp.kernel.lanczos3,
        });
        const mid = Math.floor(pxSpreadW / 2);
        const rightW = pxSpreadW - mid;
        const wopts = webpOutOpts();

        const leftBuf = await spread
          .clone()
          .extract({ left: 0, top: 0, width: mid, height: pxSpreadH })
          .webp(wopts)
          .toBuffer();
        let up = await uploadSlotWebp(admin, args.bucket, slotsDir, slotIndex++, leftBuf);
        if (!up.ok) {
          await writeFlipbookRenderProgress({
            percent: 0,
            phase: "error",
            message: `Échec envoi WebP (page ${p}, gauche) : ${up.error}`,
          });
          return up;
        }
        doneUploads++;
        pageUrls.push(up.publicUrl);
        fullSpreadSlot.push(false);

        await writeFlipbookRenderProgress({
          percent: webpPhasePercent(doneUploads, totalUploads),
          phase: "webp",
          message: `Page PDF ${p}/${maxPages} : planche double — moitié droite, JPEG → WebP (${doneUploads + 1}/${totalUploads})…`,
          pdfPageCurrent: p,
          pdfPagesTotal: maxPages,
          uploadCurrent: doneUploads + 1,
          uploadsTotal: totalUploads,
        });

        const rightBuf = await spread
          .clone()
          .extract({ left: mid, top: 0, width: rightW, height: pxSpreadH })
          .webp(wopts)
          .toBuffer();
        up = await uploadSlotWebp(admin, args.bucket, slotsDir, slotIndex++, rightBuf);
        if (!up.ok) {
          await writeFlipbookRenderProgress({
            percent: 0,
            phase: "error",
            message: `Échec envoi WebP (page ${p}, droite) : ${up.error}`,
          });
          return up;
        }
        doneUploads++;
        pageUrls.push(up.publicUrl);
        fullSpreadSlot.push(false);
      }
    }

    if (pageUrls.length === 1) {
      await writeFlipbookRenderProgress({
        percent: 92,
        phase: "webp",
        message: "Une seule page détectée : duplication de la vue pour l’affichage en reliure (sans nouvel envoi).",
        pdfPagesTotal: maxPages,
        uploadCurrent: doneUploads,
        uploadsTotal: totalUploads,
      });
      pageUrls.push(pageUrls[0]!);
      fullSpreadSlot.push(fullSpreadSlot[0] ?? true);
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

    await writeFlipbookRenderProgress({
      percent: 94,
      phase: "persist",
      message: "Enregistrement du manifeste (URLs des pages WebP) dans la base de données…",
      pdfPagesTotal: maxPages,
    });

    const manifestJson = serializeFlipbookManifest(manifest);
    await prisma.siteSetting.upsert({
      where: { key: HOME_FLIPBOOK_MANIFEST_KEY },
      create: { key: HOME_FLIPBOOK_MANIFEST_KEY, value: manifestJson },
      update: { value: manifestJson },
    });

    await writeFlipbookRenderProgress({
      percent: 97,
      phase: "persist",
      message: "Mise à jour du catalogue admin et revalidation du cache de l’accueil…",
      pdfPagesTotal: maxPages,
    });

    await updateFlipbookCatalogManifest(args.pdfStoragePath, manifestJson);

    try {
      revalidatePath("/");
    } catch {
      /* */
    }

    await clearFlipbookRenderProgress();

    console.info("[flipbook-render] terminé", pageUrls.length, "WebP (iLovePDF)");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[flipbook-render] échec", e);
    await writeFlipbookRenderProgress({
      percent: 0,
      phase: "error",
      message: msg.length > 480 ? `${msg.slice(0, 480)}…` : msg,
    });
    return { ok: false, error: msg };
  }
}
