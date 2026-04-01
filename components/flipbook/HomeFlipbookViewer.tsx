"use client";

import dynamic from "next/dynamic";
import { useCallback, useLayoutEffect, useRef, useState, type ComponentType } from "react";
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
  const flipbookRef = useRef<unknown>(null);
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

  const goPrev = useCallback(() => {
    const refValue = flipbookRef.current as
      | { pageFlip?: () => { flipPrev?: () => void }; getPageFlip?: () => { flipPrev?: () => void } }
      | null;
    const api = refValue?.pageFlip?.() ?? refValue?.getPageFlip?.();
    api?.flipPrev?.();
  }, []);

  const goNext = useCallback(() => {
    const refValue = flipbookRef.current as
      | { pageFlip?: () => { flipNext?: () => void }; getPageFlip?: () => { flipNext?: () => void } }
      | null;
    const api = refValue?.pageFlip?.() ?? refValue?.getPageFlip?.();
    api?.flipNext?.();
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

  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < pageUrls.length - 1;
  const navBtnBaseClass =
    "pointer-events-auto absolute top-1/2 z-30 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.08] bg-black/15 text-white/75 shadow-none backdrop-blur-[2px] transition-[opacity,background-color,color] duration-300 hover:border-white/15 hover:bg-black/28 hover:text-white hover:opacity-100 sm:h-8 sm:w-8";

  return (
    <div className={sceneClass}>
      <div className="flipbook-premium-stage flex flex-col items-stretch">
        <div className="flipbook-premium-tilt relative w-full">
          <HTMLFlipBook
            ref={flipbookRef as never}
            width={pageW}
            height={pageH}
            size="stretch"
            minWidth={280}
            maxWidth={680}
            minHeight={380}
            maxHeight={1100}
            showCover
            drawShadow={false}
            maxShadowOpacity={0}
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
                  className={`flipbook-page-sheet relative h-full w-full overflow-hidden rounded-[2px] bg-[#f3f1ed] [transform-style:preserve-3d] ${
                    full ? "" : "flex items-stretch justify-stretch"
                  }`}
                >
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
          {pageUrls.length > 1 ? (
            <>
              {canGoPrev ? (
                <button
                  type="button"
                  aria-label="Page précédente"
                  className={`${navBtnBaseClass} left-1 sm:left-1.5 opacity-55`}
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                    className="sm:h-[18px] sm:w-[18px]"
                  >
                    <path
                      d="M14 6L8 12L14 18"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : null}
              {canGoNext ? (
                <button
                  type="button"
                  aria-label="Page suivante"
                  className={`${navBtnBaseClass} right-1 sm:right-1.5 opacity-55`}
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                    className="sm:h-[18px] sm:w-[18px]"
                  >
                    <path
                      d="M10 6L16 12L10 18"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="flipbook-premium-contact shrink-0" aria-hidden />
      </div>
    </div>
  );
}
