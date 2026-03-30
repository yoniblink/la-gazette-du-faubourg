"use client";

import dynamic from "next/dynamic";
import { useCallback, useLayoutEffect, useState, type ComponentType } from "react";
import { FlipbookPageImage } from "@/components/flipbook/FlipbookPageImage";
import { useFlipbookLinkPreload } from "@/hooks/useFlipbookLinkPreload";
import { useFlipbookLoadedPages } from "@/hooks/useFlipbookLoadedPages";
import { useFlipbookPreload } from "@/hooks/useFlipbookPreload";
import { FLIPBOOK_STPAGE_FLIP_VISUAL } from "@/lib/flipbook-stpageflip-visual";

const HTMLFlipBook = dynamic(() => import("react-pageflip").then((m) => m.default), {
  ssr: false,
  // IProps exige des champs remplis côté types alors que le runtime merge les défauts (page-flip).
}) as unknown as ComponentType<Record<string, unknown>>;

type PageFlipEvent = { data: unknown; object: unknown };

function pageIndexFromFlipEvent(e: PageFlipEvent): number {
  const d = e.data;
  if (typeof d === "number" && Number.isFinite(d)) return d;
  if (d && typeof d === "object" && "page" in d) {
    const p = (d as { page: unknown }).page;
    if (typeof p === "number" && Number.isFinite(p)) return p;
  }
  return 0;
}

function isFlipbookActivelyTurning(state: unknown): boolean {
  return state === "user_fold" || state === "fold_corner" || state === "flipping";
}

/** Même enveloppe que le flipbook réel, sans StPageFlip (évite Suspense SSR ≠ client). */
function FlipbookPremiumPlaceholder({ pageH }: { pageH: number }) {
  const minH = Math.max(380, Math.min(pageH * 1.2, 1100));
  return (
    <div className="flipbook-premium-scene mx-auto w-full max-w-[min(100%,1360px)] px-3 pb-14 pt-2 md:px-6 md:pb-20 md:pt-4">
      <div className="flipbook-premium-stage flex flex-col items-stretch">
        <div className="flipbook-premium-tilt w-full">
          <div
            className="flipbook-premium-root mx-auto w-full rounded-[3px] bg-stone-200/40 animate-pulse motion-reduce:animate-none"
            style={{ minHeight: minH }}
          />
        </div>
        <div className="flipbook-premium-contact shrink-0" aria-hidden />
      </div>
    </div>
  );
}

export type HomeFlipbookViewerProps = {
  pageUrls: string[];
  fullSpreadSlot: boolean[];
  pageW: number;
  pageH: number;
  totalPdfPages: number;
};

export function HomeFlipbookViewer({
  pageUrls,
  fullSpreadSlot,
  pageW,
  pageH,
  totalPdfPages,
}: HomeFlipbookViewerProps) {
  /** Premier rendu aligné SSR + hydratation (évite useSyncExternalStore → client true trop tôt). */
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => {
    setMounted(true);
  }, []);
  const [currentPage, setCurrentPage] = useState(0);
  const [sceneFlipping, setSceneFlipping] = useState(false);
  const { markLoaded } = useFlipbookLoadedPages(pageUrls.length);

  useFlipbookPreload(pageUrls, currentPage);
  useFlipbookLinkPreload(pageUrls, 3);

  const handleFlip = useCallback((e: PageFlipEvent) => {
    setCurrentPage(pageIndexFromFlipEvent(e));
  }, []);

  const handleInitOrUpdate = useCallback((e: PageFlipEvent) => {
    setCurrentPage(pageIndexFromFlipEvent(e));
  }, []);

  const handleChangeState = useCallback((e: PageFlipEvent) => {
    setSceneFlipping(isFlipbookActivelyTurning(e.data));
  }, []);

  const w = Math.max(120, Math.round(pageW));
  const h = Math.max(160, Math.round(pageH));
  const sizes = "(max-width: 768px) 95vw, 680px";

  if (!mounted) {
    return <FlipbookPremiumPlaceholder pageH={pageH} />;
  }

  if (!HTMLFlipBook) return null;

  const sceneClass =
    `flipbook-premium-scene mx-auto w-full max-w-[min(100%,1360px)] px-3 pb-14 pt-2 md:px-6 md:pb-20 md:pt-4` +
    (sceneFlipping ? " flipbook-premium-scene--flipping" : "");

  return (
    <div className={sceneClass}>
      <div className="flipbook-premium-stage flex flex-col items-stretch">
        <div className="flipbook-premium-tilt w-full">
          <HTMLFlipBook
            width={pageW}
            height={pageH}
            size="stretch"
            minWidth={280}
            maxWidth={680}
            minHeight={380}
            maxHeight={1100}
            showCover
            drawShadow
            maxShadowOpacity={FLIPBOOK_STPAGE_FLIP_VISUAL.maxShadowOpacity}
            flippingTime={FLIPBOOK_STPAGE_FLIP_VISUAL.flippingTime}
            startZIndex={FLIPBOOK_STPAGE_FLIP_VISUAL.startZIndex}
            swipeDistance={FLIPBOOK_STPAGE_FLIP_VISUAL.swipeDistance}
            mobileScrollSupport
            showPageCorners
            className="flipbook-premium-root mx-auto w-full"
            style={{ marginTop: 0 }}
            onFlip={handleFlip}
            onInit={handleInitOrUpdate}
            onUpdate={handleInitOrUpdate}
            onChangeState={handleChangeState}
          >
            {pageUrls.map((src, i) => {
              const full = fullSpreadSlot[i] === true;
              const edgeLabel =
                totalPdfPages <= 1
                  ? ""
                  : i === 0
                    ? " — couverture"
                    : i === pageUrls.length - 1
                      ? " — fin"
                      : "";
              return (
                <div
                  key={`${src}-${i}`}
                  data-density={full ? "hard" : "soft"}
                  className={`flipbook-page-sheet relative h-full w-full overflow-hidden rounded-[2px] bg-[#f3f1ed] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),inset_0_0_0_1px_rgba(10,10,10,0.055),inset_-10px_0_28px_-14px_rgba(0,0,0,0.055)] [transform-style:preserve-3d] ${
                    full ? "" : "flex items-stretch justify-stretch"
                  }`}
                >
                  <div
                    className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-black/[0.03] via-transparent to-transparent"
                    aria-hidden
                  />
                  <div className="relative z-0 h-full w-full">
                    <FlipbookPageImage
                      src={src}
                      alt={full ? `Page PDF${edgeLabel}` : `Page intérieure ${i + 1}`}
                      width={w}
                      height={h}
                      index={i}
                      currentPage={currentPage}
                      eagerRadius={2}
                      priorityCount={3}
                      sizes={sizes}
                      onLoadComplete={markLoaded}
                    />
                  </div>
                </div>
              );
            })}
          </HTMLFlipBook>
        </div>

        <div className="flipbook-premium-contact shrink-0" aria-hidden />
      </div>
    </div>
  );
}
