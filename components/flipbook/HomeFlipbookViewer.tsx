"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
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

type FlipbookStretchCaps = { maxW: number; maxH: number };

const FLIPBOOK_STRETCH_MAX_NORMAL: FlipbookStretchCaps = { maxW: 680, maxH: 1100 };

function computeFullscreenSpreadStretchCaps(
  pageW: number,
  pageH: number,
  /** Signature de recalcul (resize plein écran) — non utilisé dans le calcul. */
  _resizeGeneration?: number,
): FlipbookStretchCaps {
  void _resizeGeneration;
  if (typeof window === "undefined") return { maxW: 680, maxH: 1100 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  /** Réserve pour les deux flèches + léger jeu (groupe serré au centre). */
  const navAndGutter = 112;
  const padV = 52;
  const availW = Math.max(280, vw - navAndGutter);
  const availH = Math.max(360, vh - padV);
  const pw = Math.max(120, pageW);
  const ph = Math.max(160, pageH);
  const scale = Math.min(availW / (2 * pw), availH / ph);
  const maxW = Math.max(280, Math.min(3200, Math.floor(pw * scale)));
  const maxH = Math.max(380, Math.min(3600, Math.floor(ph * scale)));
  return { maxW, maxH };
}

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
    const syncFs = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      setIsFullscreen(Boolean(document.fullscreenElement ?? doc.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", syncFs);
    document.addEventListener("webkitfullscreenchange", syncFs);
    syncFs();
    return () => {
      document.removeEventListener("fullscreenchange", syncFs);
      document.removeEventListener("webkitfullscreenchange", syncFs);
    };
  }, [mounted]);

  /** Incrémenté sur `resize` en plein écran pour recalculer les caps sans setState synchrone dans un effet (eslint react-hooks/set-state-in-effect). */
  const [fullscreenResizeGeneration, setFullscreenResizeGeneration] = useState(0);

  useEffect(() => {
    if (!isFullscreen) return;
    const onResize = () => setFullscreenResizeGeneration((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isFullscreen]);

  const stretchCaps = useMemo((): FlipbookStretchCaps => {
    if (!isFullscreen) return FLIPBOOK_STRETCH_MAX_NORMAL;
    return computeFullscreenSpreadStretchCaps(pageW, pageH, fullscreenResizeGeneration);
  }, [isFullscreen, pageW, pageH, fullscreenResizeGeneration]);

  /** Après redimensionnement plein écran / stretchCaps, StPageFlip doit remesurer ou il reste bloqué sur minWidth×minHeight (portrait). */
  useLayoutEffect(() => {
    if (!mounted || !isFullscreen) return;
    const id = requestAnimationFrame(() => {
      const refValue = flipbookRef.current as { pageFlip?: () => { update?: () => void } } | null;
      refValue?.pageFlip?.()?.update?.();
    });
    return () => cancelAnimationFrame(id);
  }, [mounted, isFullscreen, stretchCaps.maxW, stretchCaps.maxH]);

  const toggleFullscreen = useCallback(async () => {
    const el = sceneRootRef.current;
    if (!el) return;
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void>;
    };
    try {
      if (document.fullscreenElement ?? doc.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      } else {
        const req =
          el.requestFullscreen?.bind(el) ??
          (el as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen?.bind(el);
        if (req) await Promise.resolve(req());
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
  const imageSizes = isFullscreen
    ? `${Math.min(3200, Math.round(stretchCaps.maxW * 2 + 160))}px`
    : "(max-width: 768px) 95vw, 680px";

  if (!mounted) {
    return <FlipbookPremiumPlaceholder pageH={pageH} />;
  }

  if (!HTMLFlipBook) return null;

  /** Évite que le parent flex soit mesuré trop étroit → StPageFlip bascule en portrait + 280×380. */
  const fullscreenBookBoxStyle = isFullscreen
    ? {
        minWidth: Math.min(stretchCaps.maxW * 2 + 56, window.innerWidth - 32),
        minHeight: stretchCaps.maxH,
      }
    : undefined;

  const sceneClass =
    `flipbook-premium-scene mx-auto w-full max-w-[min(100%,1360px)] px-0 pb-14 pt-2 max-[1024px]:px-3 max-[768px]:px-4 md:pb-20 md:pt-4` +
    (sceneFlipping ? " flipbook-premium-scene--flipping" : "");

  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < pageUrls.length - 1;
  const showNav = pageUrls.length > 1;

  return (
    <div ref={sceneRootRef} className={`${sceneClass} relative`}>
      {isFullscreen ? (
        <button
          type="button"
          aria-label="Quitter le plein écran"
          className="absolute left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.5rem,env(safe-area-inset-top))] z-[45] flex min-h-[44px] items-center rounded-md border border-white/25 bg-white/[0.08] px-4 py-2 font-[family-name:var(--font-sans)] text-sm font-medium tracking-wide text-white shadow-sm backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 active:opacity-90"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            void toggleFullscreen();
          }}
        >
          Retour
        </button>
      ) : null}
      <div className="flipbook-premium-stage flex w-full flex-col items-center">
        <div
          className={
            `flipbook-premium-tilt relative flex w-full min-w-0 max-w-full items-center justify-center ` +
            (isFullscreen
              ? "min-h-0 flex-1"
              : showNav
                ? "gap-1.5 sm:gap-3 md:gap-4 lg:gap-5"
                : "")
          }
        >
          {showNav && !isFullscreen ? (
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
            style={fullscreenBookBoxStyle}
            className={
              `relative flex justify-center will-change-[transform] ` +
              (isFullscreen
                ? "max-w-full shrink-0"
                : `min-w-0 ${showNav ? "max-w-full flex-1" : "w-full"}`)
            }
          >
          <HTMLFlipBook
            ref={flipbookRef as never}
            width={pageW}
            height={pageH}
            size="stretch"
            minWidth={280}
            maxWidth={stretchCaps.maxW}
            minHeight={380}
            maxHeight={stretchCaps.maxH}
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
                      sizes={imageSizes}
                      onLoadComplete={markLoaded}
                    />
                  </div>
                </div>
              );
            })}
          </HTMLFlipBook>
          </div>

          {showNav && !isFullscreen ? (
            <div ref={rightNavShiftRef} className="flex shrink-0 justify-center will-change-transform">
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

          {showNav && isFullscreen ? (
            <>
              <div className="pointer-events-auto absolute left-[max(0.5rem,env(safe-area-inset-left))] top-1/2 z-[40] -translate-y-1/2">
                {canGoPrev ? (
                  <button
                    type="button"
                    aria-label="Page précédente"
                    className={
                      publicExternalNavButtonClass + " !text-white/85 hover:!text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    }
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
              <div
                ref={rightNavShiftRef}
                className="pointer-events-auto absolute right-[max(0.5rem,env(safe-area-inset-right))] top-1/2 z-[40] -translate-y-1/2 will-change-transform"
              >
                {canGoNext ? (
                  <button
                    type="button"
                    aria-label="Page suivante"
                    className={
                      publicExternalNavButtonClass + " !text-white/85 hover:!text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    }
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
            </>
          ) : null}
        </div>

        {!isFullscreen ? (
          <div className="mt-5 flex w-full max-w-full justify-center px-2 md:mt-6" data-flipbook-fs-trigger>
            <button
              type="button"
              aria-label="Passer en plein écran"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-black/[0.1] bg-white/85 px-4 py-2.5 text-[#3a3a3a] shadow-[0_1px_3px_rgba(0,0,0,0.06)] backdrop-blur-sm transition-colors hover:border-black/18 hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#aea896]/35 active:opacity-90"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                void toggleFullscreen();
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden={true}
                className="relative h-[18px] w-[18px] shrink-0 text-current md:h-5 md:w-5"
              >
                <path
                  d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  transform="rotate(180 12 12)"
                />
              </svg>
              <span className="font-[family-name:var(--font-sans)] text-sm font-medium tracking-wide">
                Plein écran
              </span>
            </button>
          </div>
        ) : null}

        <div className="flipbook-premium-contact shrink-0" aria-hidden />
      </div>
    </div>
  );
}
