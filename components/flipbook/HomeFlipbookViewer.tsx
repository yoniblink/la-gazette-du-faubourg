"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { FlipbookPageImage } from "@/components/flipbook/FlipbookPageImage";
import { useFlipbookLinkPreload } from "@/hooks/useFlipbookLinkPreload";
import { useFlipbookLoadedPages } from "@/hooks/useFlipbookLoadedPages";
import { useFlipbookPreload } from "@/hooks/useFlipbookPreload";
import { FLIPBOOK_STPAGE_FLIP_VISUAL } from "@/lib/flipbook-stpageflip-visual";
import {
  NavChevronIcon,
  publicExternalNavButtonClass,
  publicExternalNavSlotClass,
} from "@/components/icons/NavChevronIcon";

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
    <div className="flipbook-premium-scene mx-auto w-full max-w-[min(100%,1360px)] px-0 pb-14 pt-2 max-[1024px]:px-3 max-[768px]:px-4 md:pb-20 md:pt-4">
      <div className="flipbook-premium-stage flex w-full flex-col items-center">
        <div className="flipbook-premium-tilt relative flex w-full min-w-0 max-w-full justify-center">
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
  /**
   * Important: le 1er rendu client doit matcher le SSR pour éviter les erreurs d’hydratation.
   * On rend donc le placeholder d’abord, puis on active la version interactive après montage.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const [currentPage, setCurrentPage] = useState(0);
  const [sceneFlipping, setSceneFlipping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const flipbookRef = useRef<unknown>(null);
  const sceneRootRef = useRef<HTMLDivElement | null>(null);
  const bookShiftRef = useRef<HTMLDivElement>(null);
  const rightNavShiftRef = useRef<HTMLDivElement>(null);
  const reduceMotionRef = useRef(false);
  const currentPageRef = useRef(0);
  const { markLoaded } = useFlipbookLoadedPages(pageUrls.length);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    if (!mounted) return;
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    onFullscreenChange();
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [mounted]);

  const toggleFullscreen = useCallback(async () => {
    const el = sceneRootRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // Certaines compatibilités navigateurs bloquent la demande sans contexte adéquat.
    }
  }, []);

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

  /** StPageFlip ne suit que `window.resize` ; recalculer quand la colonne du livre change (flex, hydratation, navigation). */
  useEffect(() => {
    if (!mounted || typeof ResizeObserver === "undefined") return;
    const wrap = bookShiftRef.current;
    if (!wrap) return;
    let raf = 0;
    const scheduleUpdate = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const refValue = flipbookRef.current as { pageFlip?: () => { update?: () => void } } | null;
        refValue?.pageFlip?.()?.update?.();
      });
    };
    const ro = new ResizeObserver(scheduleUpdate);
    ro.observe(wrap);
    scheduleUpdate();
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [mounted, pageUrls.length]);

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
    `flipbook-premium-scene mx-auto w-full max-w-[min(100%,1360px)] px-0 pb-14 pt-2 max-[1024px]:px-3 max-[768px]:px-4 md:pb-20 md:pt-4` +
    (sceneFlipping ? " flipbook-premium-scene--flipping" : "");

  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < pageUrls.length - 1;
  const showNav = pageUrls.length > 1;

  return (
    <div ref={sceneRootRef} className={`${sceneClass} relative`}>
      <button
        type="button"
        aria-label={isFullscreen ? "Quitter le plein écran" : "Passer en plein écran"}
        aria-pressed={isFullscreen}
        className={`${publicExternalNavButtonClass} absolute right-2 top-2 hidden md:flex md:right-4 md:top-4`}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          void toggleFullscreen();
        }}
      >
        {isFullscreen ? (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden className="relative h-5 w-5">
            <path
              d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden className="relative h-5 w-5">
            <path
              d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="rotate(180 12 12)"
            />
          </svg>
        )}
      </button>
      <div className="flipbook-premium-stage flex w-full flex-col items-center">
        <div
          className={`flipbook-premium-tilt relative flex w-full min-w-0 max-w-full items-center justify-center ${showNav ? "gap-1.5 sm:gap-3 md:gap-4 lg:gap-5" : ""}`}
        >
          {showNav ? (
            <div className="flex shrink-0 justify-center">
              {canGoPrev ? (
                <button
                  type="button"
                  aria-label="Page précédente"
                  className={publicExternalNavButtonClass}
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                >
                  <NavChevronIcon direction="left" className="relative h-5 w-5 md:h-[22px] md:w-[22px]" />
                </button>
              ) : (
                <span className={publicExternalNavSlotClass} aria-hidden />
              )}
            </div>
          ) : null}

          <div
            ref={bookShiftRef}
            className={`relative flex min-w-0 max-w-full justify-center will-change-[transform] ${showNav ? "flex-1" : "w-full"}`}
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
                  className={publicExternalNavButtonClass}
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                >
                  <NavChevronIcon direction="right" className="relative h-5 w-5 md:h-[22px] md:w-[22px]" />
                </button>
              ) : (
                <span className={publicExternalNavSlotClass} aria-hidden />
              )}
            </div>
          ) : null}
        </div>

        <div className="flipbook-premium-contact shrink-0" aria-hidden />
      </div>
    </div>
  );
}
