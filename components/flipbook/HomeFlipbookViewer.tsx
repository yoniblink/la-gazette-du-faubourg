"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
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

/** StPageFlip : enum numérique (FORWARD = 0, BACK = 1) dans le bundle. */
const FLIP_DIR_FORWARD = 0;
const FLIP_DIR_BACK = 1;

function easeInOutCubic(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Même style que les flèches externes Instagram / À la une (bouton clair hors du bloc). */
const flipbookExternalNavBtnClass =
  "relative z-30 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/12 bg-white/95 text-[#0a0a0a]/45 shadow-[0_2px_12px_rgba(0,0,0,0.06)] backdrop-blur-[2px] transition-all duration-200 hover:border-black/20 hover:bg-white hover:text-[#0a0a0a]/85 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]/20 md:h-10 md:w-10";

const flipbookExternalNavSlotClass = "h-9 w-9 shrink-0 md:h-10 md:w-10";

type PageFlipRuntime = {
  getCurrentPageIndex: () => number;
  getBoundsRect: () => { pageWidth: number };
  getOrientation: () => string;
  getFlipController: () => {
    getCalculation: () => null | { getFlippingProgress: () => number; getDirection: () => number };
    getState: () => string;
  };
};

function bookShiftRatioFromFlip(flip: PageFlipRuntime, reduceMotion: boolean): number {
  const pageIdx = flip.getCurrentPageIndex();
  if (reduceMotion) return pageIdx > 0 ? 1 : 0;

  const ctrl = flip.getFlipController();
  const calc = ctrl.getCalculation();
  const st = ctrl.getState();
  if (calc && (st === "flipping" || st === "user_fold" || st === "fold_corner")) {
    const raw = Math.min(1, Math.max(0, calc.getFlippingProgress() / 100));
    const dir = calc.getDirection();
    if (pageIdx === 0 && dir === FLIP_DIR_FORWARD) return easeInOutCubic(raw);
    if (pageIdx === 1 && dir === FLIP_DIR_BACK) return easeInOutCubic(Math.max(0, 1 - raw));
    return pageIdx > 0 ? 1 : 0;
  }
  return pageIdx > 0 ? 1 : 0;
}

/** Même enveloppe que le flipbook réel, sans StPageFlip (évite Suspense SSR ≠ client). */
function FlipbookPremiumPlaceholder({ pageH }: { pageH: number }) {
  const minH = Math.max(380, Math.min(pageH * 1.2, 1100));
  return (
    <div className="flipbook-premium-scene mx-auto w-full max-w-[min(100%,1360px)] px-3 pb-14 pt-2 md:px-6 md:pb-20 md:pt-4">
      <div className="flipbook-premium-stage flex flex-col items-stretch">
        <div className="flipbook-premium-tilt relative flex w-full justify-center">
          <div className="relative w-full min-w-0 max-w-full translate-x-0">
            <div
              className="flipbook-premium-root mx-auto w-full rounded-[3px] bg-stone-200/40 animate-pulse motion-reduce:animate-none"
              style={{ minHeight: minH }}
            />
          </div>
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
  const bookShiftRef = useRef<HTMLDivElement>(null);
  const rightNavShiftRef = useRef<HTMLDivElement>(null);
  const reduceMotionRef = useRef(false);
  const currentPageRef = useRef(0);
  currentPageRef.current = currentPage;
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

  /** Décalage synchronisé sur la progression réelle StPageFlip (drag + animation). */
  useEffect(() => {
    if (!mounted) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceMotionRef.current = mq.matches;
    const onMq = () => {
      reduceMotionRef.current = mq.matches;
    };
    mq.addEventListener("change", onMq);

    let rafId = 0;
    const tick = () => {
      const el = bookShiftRef.current;
      const refValue = flipbookRef.current as { pageFlip?: () => PageFlipRuntime } | null;
      const flipApi = refValue?.pageFlip?.();
      const ratio = flipApi
        ? bookShiftRatioFromFlip(flipApi, reduceMotionRef.current)
        : currentPageRef.current > 0
          ? 1
          : 0;
      const bounds = flipApi?.getBoundsRect?.();
      const orient = flipApi?.getOrientation?.();
      const pageWRendered =
        bounds && typeof bounds.pageWidth === "number" && Number.isFinite(bounds.pageWidth)
          ? bounds.pageWidth
          : 0;
      /** En landscape + showCover, une seule page visible occupe la moitié droite du bloc 2×page — recentrer vers la gauche. */
      const coverCenterPx =
        orient === "landscape" && pageWRendered > 0 ? (-pageWRendered / 2) * (1 - ratio) : 0;
      const px = coverCenterPx;
      /** Même `translateX` pour le livre et la flèche droite : pas de décalage supplémentaire une fois ouvert (évite un biais à droite). */
      if (el) {
        el.style.transform = `translate3d(${px}px, 0, 0)`;
      }
      const navEl = rightNavShiftRef.current;
      if (navEl) {
        navEl.style.transform = px !== 0 ? `translate3d(${px}px, 0, 0)` : "";
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      mq.removeEventListener("change", onMq);
      cancelAnimationFrame(rafId);
    };
  }, [mounted]);

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
  const showNav = pageUrls.length > 1;

  return (
    <div className={sceneClass}>
      <div className="flipbook-premium-stage flex flex-col items-stretch">
        <div
          className={`flipbook-premium-tilt relative flex w-full items-center ${showNav ? "gap-2 sm:gap-3 md:gap-4 lg:gap-5" : "justify-center"}`}
        >
          {showNav ? (
            <div className="flex shrink-0 justify-center">
              {canGoPrev ? (
                <button
                  type="button"
                  aria-label="Page précédente"
                  className={flipbookExternalNavBtnClass}
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                >
                  <span className="absolute inset-0 rounded-full border border-black/[0.05]" aria-hidden />
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                    className="relative md:h-[18px] md:w-[18px]"
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
              ) : (
                <span className={flipbookExternalNavSlotClass} aria-hidden />
              )}
            </div>
          ) : null}

          <div
            ref={bookShiftRef}
            className={`relative min-w-0 max-w-full will-change-[transform] ${showNav ? "flex-1" : "w-full"}`}
          >
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
          </div>

          {showNav ? (
            <div
              ref={rightNavShiftRef}
              className="flex shrink-0 justify-center will-change-transform"
            >
              {canGoNext ? (
                <button
                  type="button"
                  aria-label="Page suivante"
                  className={flipbookExternalNavBtnClass}
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                >
                  <span className="absolute inset-0 rounded-full border border-black/[0.05]" aria-hidden />
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                    className="relative md:h-[18px] md:w-[18px]"
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
              ) : (
                <span className={flipbookExternalNavSlotClass} aria-hidden />
              )}
            </div>
          ) : null}
        </div>

        <div className="flipbook-premium-contact shrink-0" aria-hidden />
      </div>
    </div>
  );
}
