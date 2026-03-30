"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { InstagramReelPublic } from "@/lib/data/instagram-reels";
import { site } from "@/lib/content/site";

function StoryProgressSegments({
  count,
  activeIndex,
  progress01,
}: {
  count: number;
  activeIndex: number;
  progress01: number;
}) {
  if (count <= 0) return null;
  return (
    <div className="mb-1.5 flex gap-1">
      {Array.from({ length: count }).map((_, i) => {
        let widthPct = 0;
        if (i < activeIndex) widthPct = 100;
        else if (i === activeIndex) widthPct = Math.min(100, Math.max(0, progress01 * 100));
        return (
          <div key={i} className="h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-white/35">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${widthPct}%`, transition: "width 0.12s linear" }}
            />
          </div>
        );
      })}
    </div>
  );
}

function StoryMediaToolbar({
  muted,
  onToggleMute,
  playing,
  onTogglePlay,
}: {
  muted: boolean;
  onToggleMute: () => void;
  playing: boolean;
  onTogglePlay: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute();
        }}
        className="rounded-md p-1.5 text-white transition-opacity hover:opacity-90"
        aria-label={muted ? "Activer le son" : "Couper le son"}
      >
        {muted ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="drop-shadow-md">
            <path
              d="M11 5L6 9H3v6h3l5 4V5zM16 9l4 4m0-4l-4 4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="drop-shadow-md">
            <path
              d="M11 5L6 9H3v6h3l5 4V5zM15.54 8.46a5 5 0 010 7.07M17.66 6.34a8 8 0 010 11.32"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePlay();
        }}
        className="rounded-md p-1.5 text-white transition-opacity hover:opacity-90"
        aria-label={playing ? "Pause" : "Lecture"}
      >
        {playing ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="drop-shadow-md">
            <rect x="6" y="5" width="4" height="14" rx="0.5" />
            <rect x="14" y="5" width="4" height="14" rx="0.5" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="drop-shadow-md">
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
        )}
      </button>
    </div>
  );
}

function StoryProfileRow({ compact }: { compact?: boolean }) {
  const { displayHandle } = site.instagramReels;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        className={`relative shrink-0 rounded-full p-[2px] shadow-sm ${compact ? "h-8 w-8" : "h-8 w-8 md:h-9 md:w-9"}`}
        style={{
          background: "linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)",
        }}
      >
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#fafafa]">
          <Image
            src={site.navbarLogoSrc}
            alt=""
            width={180}
            height={180}
            className="h-[72%] w-[72%] object-contain"
            sizes="36px"
          />
        </div>
      </div>
      <p className="min-w-0 truncate font-[family-name:var(--font-sans)] text-[12px] font-semibold leading-tight tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)] md:text-[13px]">
        {displayHandle}
      </p>
    </div>
  );
}

function StoryReelOverlay({
  compact,
  showChrome,
  segmentCount,
  activeSegmentIndex,
  segmentProgress01,
  muted,
  onToggleMute,
  playing,
  onTogglePlay,
}: {
  compact?: boolean;
  showChrome: boolean;
  segmentCount: number;
  activeSegmentIndex: number;
  segmentProgress01: number;
  muted: boolean;
  onToggleMute: () => void;
  playing: boolean;
  onTogglePlay: () => void;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/65 via-black/25 to-transparent ${
        compact ? "px-2.5 pb-6 pt-1" : "px-2.5 pb-8 pt-1 md:px-3"
      }`}
    >
      {showChrome ? (
        <>
          <StoryProgressSegments
            count={segmentCount}
            activeIndex={activeSegmentIndex}
            progress01={segmentProgress01}
          />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 pt-0.5">
              <StoryProfileRow compact={compact} />
            </div>
            <div className="pointer-events-auto">
              <StoryMediaToolbar
                muted={muted}
                onToggleMute={onToggleMute}
                playing={playing}
                onTogglePlay={onTogglePlay}
              />
            </div>
          </div>
        </>
      ) : (
        <div className={`pt-1 ${compact ? "" : "pt-0.5"}`}>
          <StoryProfileRow compact={compact} />
        </div>
      )}
    </div>
  );
}

function StoryNavArrows({
  onPrev,
  onNext,
}: {
  onPrev: () => void;
  onNext: () => void;
}) {
  const btnClass =
    "pointer-events-auto absolute top-1/2 z-30 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.08] bg-black/15 text-white/75 shadow-none backdrop-blur-[2px] transition-[opacity,background-color,color] duration-300 hover:border-white/15 hover:bg-black/28 hover:text-white hover:opacity-100 sm:h-8 sm:w-8 opacity-55";
  return (
    <>
      <button
        type="button"
        aria-label="Vidéo précédente"
        className={`${btnClass} left-1 sm:left-1.5`}
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="sm:h-[18px] sm:w-[18px]">
          <path d="M14 6L8 12L14 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Vidéo suivante"
        className={`${btnClass} right-1 sm:right-1.5`}
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="sm:h-[18px] sm:w-[18px]">
          <path d="M10 6L16 12L10 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  );
}

function relativeIndex(i: number, active: number, n: number): number {
  let d = i - active;
  const half = Math.floor(n / 2);
  if (d > half) d -= n;
  if (d < -half) d += n;
  return d;
}

type MobileReelCardProps = {
  reel: InstagramReelPublic;
  reelIndex: number;
  totalCount: number;
};

function MobileReelCard({ reel, reelIndex, totalCount }: MobileReelCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [progress01, setProgress01] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const v = videoRef.current;
    if (!wrap || !v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.45) {
          void v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: [0, 0.45, 0.6] },
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      const d = v.duration;
      if (d && Number.isFinite(d)) setProgress01(v.currentTime / d);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    setPlaying(!v.paused);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, []);

  const toggleMute = () => {
    const v = videoRef.current;
    setMuted((m) => {
      const next = !m;
      if (v) v.muted = next;
      return next;
    });
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  return (
    <div
      ref={wrapRef}
      className="relative aspect-[9/16] w-[min(78vw,300px)] shrink-0 snap-center overflow-hidden rounded-2xl bg-black shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.08]"
    >
      <StoryReelOverlay
        compact
        showChrome
        segmentCount={totalCount}
        activeSegmentIndex={reelIndex}
        segmentProgress01={progress01}
        muted={muted}
        onToggleMute={toggleMute}
        playing={playing}
        onTogglePlay={togglePlay}
      />
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.posterUrl ?? undefined}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
      {reel.caption ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-10 font-[family-name:var(--font-sans)] text-[11px] leading-snug text-white/95 md:text-xs">
          {reel.caption}
        </p>
      ) : null}
    </div>
  );
}

export function InstagramReelsStack({ reels }: { reels: InstagramReelPublic[] }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const n = reels.length;
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [storyMuted, setStoryMuted] = useState(true);
  const [progress01, setProgress01] = useState(0);
  const [playing, setPlaying] = useState(true);

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => (i + dir + n) % n);
    },
    [n],
  );

  useEffect(() => {
    reels.forEach((_, i) => {
      const v = videoRefs.current[i];
      if (!v) return;
      v.muted = storyMuted;
    });
  }, [storyMuted, reels]);

  useEffect(() => {
    reels.forEach((_, i) => {
      const v = videoRefs.current[i];
      if (!v) return;
      const pos = relativeIndex(i, index, n);
      if (pos === 0) void v.play().catch(() => {});
      else v.pause();
    });
  }, [index, n, reels]);

  useEffect(() => {
    const v = videoRefs.current[index];
    if (!v) return;
    const onTime = () => {
      const d = v.duration;
      if (d && Number.isFinite(d)) setProgress01(v.currentTime / d);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    onTime();
    setPlaying(!v.paused);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [index, reels]);

  useEffect(() => {
    setProgress01(0);
  }, [index]);

  const toggleMute = useCallback(() => {
    setStoryMuted((m) => !m);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRefs.current[index];
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }, [index]);

  if (n === 0) return null;

  return (
    <div className="mt-12 w-full">
      <div className="hidden md:block">
        <div
          className="relative mx-auto h-[min(72vh,560px)] max-w-5xl"
          role="region"
          aria-roledescription="carrousel"
          aria-label="Vidéos Instagram"
        >
          {reels.map((reel, i) => {
            const pos = relativeIndex(i, index, n);
            if (Math.abs(pos) > 1) return null;
            const isCenter = pos === 0;
            return (
              <motion.div
                key={reel.id}
                role={isCenter ? undefined : "button"}
                tabIndex={isCenter ? undefined : 0}
                aria-current={isCenter ? "true" : undefined}
                aria-label={isCenter ? undefined : `Afficher la vidéo ${i + 1} sur ${n}`}
                onClick={() => !isCenter && setIndex(i)}
                onKeyDown={(e) => {
                  if (isCenter) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setIndex(i);
                  }
                }}
                className={`absolute left-1/2 top-1/2 w-[min(300px,28vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-black text-left shadow-[0_32px_80px_-28px_rgba(0,0,0,0.45)] ring-1 ring-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${!isCenter ? "cursor-pointer" : ""}`}
                initial={false}
                animate={
                  reduceMotion
                    ? { x: pos * 200, scale: isCenter ? 1 : 0.88, opacity: isCenter ? 1 : 0.75, zIndex: 20 - Math.abs(pos) }
                    : {
                        x: pos * 220,
                        scale: isCenter ? 1 : 0.86,
                        opacity: isCenter ? 1 : 0.78,
                        zIndex: 20 - Math.abs(pos),
                      }
                }
                transition={{ type: "spring", stiffness: 280, damping: 32 }}
              >
                <div className="relative aspect-[9/16] w-full">
                  <StoryReelOverlay
                    showChrome={isCenter}
                    segmentCount={n}
                    activeSegmentIndex={index}
                    segmentProgress01={isCenter ? progress01 : 0}
                    muted={storyMuted}
                    onToggleMute={toggleMute}
                    playing={playing}
                    onTogglePlay={togglePlay}
                  />
                  <video
                    ref={(el) => {
                      videoRefs.current[i] = el;
                    }}
                    src={reel.videoUrl}
                    poster={reel.posterUrl ?? undefined}
                    muted={storyMuted}
                    loop
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                  {reel.caption && isCenter ? (
                    <p className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12 text-center font-[family-name:var(--font-sans)] text-xs leading-relaxed text-white/95">
                      {reel.caption}
                    </p>
                  ) : null}
                  {isCenter && n > 1 ? <StoryNavArrows onPrev={() => go(-1)} onNext={() => go(1)} /> : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="md:hidden">
        <div
          className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth scroll-pb-4 px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="region"
          aria-label="Vidéos Instagram"
        >
          {reels.map((reel, i) => (
            <MobileReelCard key={reel.id} reel={reel} reelIndex={i} totalCount={n} />
          ))}
        </div>
      </div>
    </div>
  );
}
