"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MotionDiv } from "@/components/motion-prefers";
import { fadeUp } from "@/lib/motion";

const MAX_PAGES = 50;
/** Cap raster DPR (retina 2× canvas is slow; 1.25× is usually enough on screen). */
const RASTER_DPR_CAP = 1.25;
/** Parallel PDF page renders; higher = faster but more RAM spikes. */
const PAGE_RENDER_CONCURRENCY = 3;
const JPEG_QUALITY = 0.82;

// react-pageflip ships without TypeScript types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HTMLFlipBook = dynamic(() => import("react-pageflip").then((m) => m.default), { ssr: false }) as any;

/**
 * Cover + last: one raster per face at **single-column** size (matches the flip cell — no tiny letterboxed cover).
 * Middle pages: full **spread** raster, then split L/R.
 */
async function loadPdfPagesForFlipbook(
  pdfUrl: string,
  cssHalfSpreadWidthPx: number,
): Promise<{
  urls: string[];
  fullSpreadSlot: boolean[];
  pageW: number;
  pageH: number;
  totalPdfPages: number;
}> {
  // Legacy build polyfills Map.getOrInsertComputed etc. — the default bundle breaks on many browsers (Safari, older Chrome).
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

  const absoluteUrl = pdfUrl.startsWith("http")
    ? pdfUrl
    : `${window.location.origin}${pdfUrl.startsWith("/") ? pdfUrl : `/${pdfUrl}`}`;

  const loadingTask = pdfjs.getDocument(absoluteUrl);
  const pdf = await loadingTask.promise;
  const totalPdfPages = pdf.numPages;
  const numPages = Math.min(totalPdfPages, MAX_PAGES);

  const page1 = await pdf.getPage(1);
  const refBase = page1.getViewport({ scale: 1 });
  const dpr = Math.min(
    RASTER_DPR_CAP,
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
  );
  const cssPageH = cssHalfSpreadWidthPx * (refBase.height / refBase.width);
  const pxSpreadW = Math.round(2 * cssHalfSpreadWidthPx * dpr);
  const pxSpreadH = Math.round(cssPageH * dpr);
  const pxSingleColW = Math.round(cssHalfSpreadWidthPx * dpr);

  const urls: string[] = [];
  const fullSpreadSlot: boolean[] = [];
  const q = JPEG_QUALITY;

  /** One flip cell wide (cover / back cover) — same aspect as HTMLFlipBook width × height. */
  async function rasterSingleColumn(p: number): Promise<HTMLCanvasElement> {
    const page = await pdf.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const fitScale = Math.min(pxSingleColW / base.width, pxSpreadH / base.height);
    const vp = page.getViewport({ scale: fitScale });
    const c = document.createElement("canvas");
    c.width = pxSingleColW;
    c.height = pxSpreadH;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Canvas non disponible");
    ctx.fillStyle = "#f5f5f4";
    ctx.fillRect(0, 0, pxSingleColW, pxSpreadH);
    const tile = document.createElement("canvas");
    tile.width = vp.width;
    tile.height = vp.height;
    const tctx = tile.getContext("2d");
    if (!tctx) throw new Error("Canvas non disponible");
    await page.render({ canvasContext: tctx, viewport: vp, canvas: tile }).promise;
    ctx.drawImage(tile, (pxSingleColW - vp.width) / 2, (pxSpreadH - vp.height) / 2);
    return c;
  }

  async function rasterSpread(p: number): Promise<HTMLCanvasElement> {
    const page = await pdf.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const fitScale = Math.min(pxSpreadW / base.width, pxSpreadH / base.height);
    const vp = page.getViewport({ scale: fitScale });
    const spread = document.createElement("canvas");
    spread.width = pxSpreadW;
    spread.height = pxSpreadH;
    const sctx = spread.getContext("2d");
    if (!sctx) throw new Error("Canvas non disponible");
    sctx.fillStyle = "#f5f5f4";
    sctx.fillRect(0, 0, pxSpreadW, pxSpreadH);
    const tile = document.createElement("canvas");
    tile.width = vp.width;
    tile.height = vp.height;
    const tctx = tile.getContext("2d");
    if (!tctx) throw new Error("Canvas non disponible");
    await page.render({ canvasContext: tctx, viewport: vp, canvas: tile }).promise;
    sctx.drawImage(tile, (pxSpreadW - vp.width) / 2, (pxSpreadH - vp.height) / 2);
    return spread;
  }

  async function processPdfPage(p: number): Promise<{ p: number; outs: { url: string; full: boolean }[] }> {
    const isEdge = p === 1 || p === numPages;
    if (isEdge) {
      const col = await rasterSingleColumn(p);
      return { p, outs: [{ url: col.toDataURL("image/jpeg", q), full: true }] };
    }
    const spread = await rasterSpread(p);
    const mid = Math.floor(pxSpreadW / 2);
    const left = document.createElement("canvas");
    left.width = mid;
    left.height = pxSpreadH;
    left.getContext("2d")!.drawImage(spread, 0, 0, mid, pxSpreadH, 0, 0, mid, pxSpreadH);
    const right = document.createElement("canvas");
    right.width = pxSpreadW - mid;
    right.height = pxSpreadH;
    right
      .getContext("2d")!
      .drawImage(spread, mid, 0, pxSpreadW - mid, pxSpreadH, 0, 0, right.width, pxSpreadH);
    return {
      p,
      outs: [
        { url: left.toDataURL("image/jpeg", q), full: false },
        { url: right.toDataURL("image/jpeg", q), full: false },
      ],
    };
  }

  for (let start = 1; start <= numPages; start += PAGE_RENDER_CONCURRENCY) {
    const end = Math.min(start + PAGE_RENDER_CONCURRENCY - 1, numPages);
    const batch = await Promise.all(
      Array.from({ length: end - start + 1 }, (_, k) => processPdfPage(start + k)),
    );
    batch.sort((a, b) => a.p - b.p);
    for (const item of batch) {
      for (const o of item.outs) {
        urls.push(o.url);
        fullSpreadSlot.push(o.full);
      }
    }
  }

  if (urls.length === 1) {
    urls.push(urls[0]);
    fullSpreadSlot.push(fullSpreadSlot[0]);
  }

  return {
    urls,
    fullSpreadSlot,
    pageW: cssHalfSpreadWidthPx,
    pageH: cssPageH,
    totalPdfPages,
  };
}

export function HomeFlipbook({ pdfUrl }: { pdfUrl: string }) {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [fullSpreadSlot, setFullSpreadSlot] = useState<boolean[]>([]);
  const [pageW, setPageW] = useState(400);
  const [pageH, setPageH] = useState(560);
  const [totalPdfPages, setTotalPdfPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    setErrorMessage(null);

    const run = async () => {
      try {
        const w = window.innerWidth;
        const cssHalfSpreadWidthPx =
          w < 768
            ? Math.min(440, Math.max(280, w - 48))
            : Math.min(600, Math.max(360, Math.floor((Math.min(w, 1536) - 96) / 2)));
        const result = await loadPdfPagesForFlipbook(pdfUrl, cssHalfSpreadWidthPx);
        if (cancelled) return;
        setUrls(result.urls);
        setFullSpreadSlot(result.fullSpreadSlot);
        setPageW(Math.max(120, Math.round(result.pageW)));
        setPageH(Math.max(160, Math.round(result.pageH)));
        setTotalPdfPages(result.totalPdfPages);
        setPhase("ready");
      } catch (e) {
        if (cancelled) return;
        setErrorMessage(e instanceof Error ? e.message : "Impossible de charger le PDF");
        setPhase("error");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  return (
    <section id="flipbook" className="scroll-mt-24 border-y border-black/[0.06] bg-[#fafafa] py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <MotionDiv
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10% 0px" }}
          className="text-center"
        >
          <h2 className="font-[family-name:var(--font-serif)] text-[clamp(1.65rem,3vw,2.35rem)] font-light leading-snug text-[#0a0a0a]">
            Feuilletez le magazine
          </h2>
        </MotionDiv>

        <div className="mt-12 flex min-h-[min(70vh,520px)] w-full flex-col items-center justify-center">
          {phase === "loading" ? (
            <p className="font-[family-name:var(--font-sans)] text-sm text-[#5a5a5a]">Préparation du flipbook…</p>
          ) : null}

          {phase === "error" ? (
            <p className="max-w-md text-center font-[family-name:var(--font-sans)] text-sm text-red-800">
              {errorMessage ?? "Erreur de chargement"}
            </p>
          ) : null}

          {phase === "ready" && urls.length > 0 && HTMLFlipBook ? (
            <HTMLFlipBook
              width={pageW}
              height={pageH}
              size="stretch"
              minWidth={280}
              maxWidth={680}
              minHeight={380}
              maxHeight={1100}
              showCover
              maxShadowOpacity={0.45}
              mobileScrollSupport
              className="mx-auto w-full max-w-[min(100%,1360px)]"
              style={{ marginTop: "0.5rem" }}
            >
              {urls.map((src, i) => {
                const full = fullSpreadSlot[i] === true;
                const edgeLabel =
                  totalPdfPages <= 1
                    ? ""
                    : i === 0
                      ? " — couverture"
                      : i === urls.length - 1
                        ? " — fin"
                        : "";
                return (
                  <div
                    key={`${pdfUrl}-${i}`}
                    className={`relative h-full w-full overflow-hidden border border-black/[0.08] bg-stone-200 ${
                      full ? "" : "flex items-stretch justify-stretch"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={full ? `Page PDF${edgeLabel}` : `Moitié ${i + 1} (page intérieure)`}
                      className="h-full w-full object-fill select-none"
                      draggable={false}
                    />
                  </div>
                );
              })}
            </HTMLFlipBook>
          ) : null}
        </div>

        {phase === "ready" ? (
          <div className="mt-10 flex flex-col items-center gap-3 text-center font-[family-name:var(--font-sans)] text-sm text-[#5a5a5a]">
            {totalPdfPages > MAX_PAGES ? (
              <p>
                Aperçu des {MAX_PAGES} premières pages sur {totalPdfPages} — téléchargez le fichier pour la version
                complète.
              </p>
            ) : null}
            <Link
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-[#0a0a0a]/25 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[#0a0a0a] transition-colors hover:border-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white"
            >
              Télécharger le PDF
              <span aria-hidden>↓</span>
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
