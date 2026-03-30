/**
 * Flipbook : PDF → PNG dans Storage via l’API iLovePDF (outil pdfjpg), puis upload Supabase slots/.
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
import { HOME_FLIPBOOK_MANIFEST_KEY } from "@/lib/site-settings";
import { createSupabaseServiceRoleClient } from "@/lib/supabase-service";
import type { SupabaseClient } from "@supabase/supabase-js";

const PNG_COMPRESSION_LEVEL = 6;
const DEFAULT_RENDER_DPR = 1.12;
const DEFAULT_HALF_SPREAD_CSS_PX = 400;
const DEFAULT_MAX_PAGES = 12;

type LayoutMode = "auto" | "portrait" | "spread";

export type FlipbookRenderResult = { ok: true } | { ok: false; error: string };

export function hasILovePdfCredentials(): boolean {
  return Boolean(
    process.env.ILOVEPDF_PUBLIC_KEY?.trim() && process.env.ILOVEPDF_SECRET_KEY?.trim(),
  );
}

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

function pngOutOpts(): { compressionLevel: number; adaptiveFiltering: boolean } {
  const n = parseInt(process.env.FLIPBOOK_RENDER_PNG_LEVEL ?? String(PNG_COMPRESSION_LEVEL), 10);
  const level = Number.isFinite(n) ? Math.min(Math.max(n, 0), 9) : PNG_COMPRESSION_LEVEL;
  return { compressionLevel: level, adaptiveFiltering: true };
}

function isLikelyMergedSpread(pageW: number, pageH: number): boolean {
  return pageW >= pageH * 1.12;
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
  await task.process({ pdfjpg_mode: "pages" });
  const data = await task.download();
  return Buffer.from(data);
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

async function jpegToTargetPng(jpeg: Buffer, targetW: number, targetH: number): Promise<Buffer> {
  return sharp(jpeg)
    .resize(targetW, targetH, {
      fit: "contain",
      position: "centre",
      background: "#f5f5f4",
      kernel: sharp.kernel.lanczos3,
    })
    .png(pngOutOpts())
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
    if (!hasILovePdfCredentials()) {
      return {
        ok: false,
        error:
          "Clés iLovePDF manquantes : définissez ILOVEPDF_PUBLIC_KEY et ILOVEPDF_SECRET_KEY (https://developer.ilovepdf.com).",
      };
    }

    const layout = pdfLayoutMode();
    console.info("[flipbook-render] iLovePDF pdfjpg", args.pdfStoragePath, "layout=", layout);

    const zipBuf = await ilovePdfPdfToJpegZip(args.publicPdfUrl);
    const allJpegs = await extractJpegsFromZip(zipBuf);
    const totalPdfPages = allJpegs.length;
    const limit = maxRenderPages();
    const maxPages = Math.min(totalPdfPages, limit);
    const pages = allJpegs.slice(0, maxPages);

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
        const buf = await jpegToTargetPng(jpegBuf, pxSingleColW, pxSpreadH);
        const up = await uploadSlotPng(admin, args.bucket, slotsDir, slotIndex++, buf);
        if (!up.ok) return up;
        pageUrls.push(up.publicUrl);
        fullSpreadSlot.push(isEdge);
      } else {
        const spreadPng = await jpegToTargetPng(jpegBuf, pxSpreadW, pxSpreadH);
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
    }

    if (pageUrls.length === 1) {
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

    await prisma.siteSetting.upsert({
      where: { key: HOME_FLIPBOOK_MANIFEST_KEY },
      create: { key: HOME_FLIPBOOK_MANIFEST_KEY, value: serializeFlipbookManifest(manifest) },
      update: { value: serializeFlipbookManifest(manifest) },
    });

    try {
      revalidatePath("/");
    } catch {
      /* */
    }

    console.info("[flipbook-render] terminé", pageUrls.length, "PNG (iLovePDF)");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[flipbook-render] échec", e);
    return { ok: false, error: msg };
  }
}
