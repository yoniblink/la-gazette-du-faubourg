"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { InstagramReelPublic } from "@/lib/data/instagram-reels";

function relativeIndex(i: number, active: number, n: number): number {
  let d = i - active;
  const half = Math.floor(n / 2);
  if (d > half) d -= n;
  if (d < -half) d += n;
  return d;
}

function MobileReelCard({ reel }: { reel: InstagramReelPublic }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  return (
    <div
      ref={wrapRef}
      className="relative aspect-[9/16] w-[min(78vw,300px)] shrink-0 snap-center overflow-hidden rounded-2xl bg-black shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.08]"
    >
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.posterUrl ?? undefined}
        muted
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
      {reel.caption ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-10 font-[family-name:var(--font-sans)] text-[11px] leading-snug text-white/95 md:text-xs">
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
      const pos = relativeIndex(i, index, n);
      if (pos === 0) void v.play().catch(() => {});
      else v.pause();
    });
  }, [index, n, reels]);

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
            return (
              <motion.button
                key={reel.id}
                type="button"
                aria-current={pos === 0 ? "true" : undefined}
                onClick={() => pos !== 0 && setIndex(i)}
                className="absolute left-1/2 top-1/2 w-[min(300px,28vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-black text-left shadow-[0_32px_80px_-28px_rgba(0,0,0,0.45)] ring-1 ring-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                initial={false}
                animate={
                  reduceMotion
                    ? { x: pos * 200, scale: pos === 0 ? 1 : 0.88, opacity: pos === 0 ? 1 : 0.75, zIndex: 20 - Math.abs(pos) }
                    : {
                        x: pos * 220,
                        scale: pos === 0 ? 1 : 0.86,
                        opacity: pos === 0 ? 1 : 0.78,
                        zIndex: 20 - Math.abs(pos),
                      }
                }
                transition={{ type: "spring", stiffness: 280, damping: 32 }}
              >
                <div className="relative aspect-[9/16] w-full">
                  <video
                    ref={(el) => {
                      videoRefs.current[i] = el;
                    }}
                    src={reel.videoUrl}
                    poster={reel.posterUrl ?? undefined}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                  {reel.caption && pos === 0 ? (
                    <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12 text-center font-[family-name:var(--font-sans)] text-xs leading-relaxed text-white/95">
                      {reel.caption}
                    </p>
                  ) : null}
                </div>
              </motion.button>
            );
          })}
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            className="rounded-full border border-black/[0.12] bg-white px-5 py-2.5 font-[family-name:var(--font-sans)] text-[10px] font-medium uppercase tracking-[0.2em] text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-white"
          >
            Précédent
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="rounded-full border border-black/[0.12] bg-white px-5 py-2.5 font-[family-name:var(--font-sans)] text-[10px] font-medium uppercase tracking-[0.2em] text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-white"
          >
            Suivant
          </button>
        </div>
      </div>

      <div className="md:hidden">
        <div
          className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth scroll-pb-4 px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="region"
          aria-label="Vidéos Instagram"
        >
          {reels.map((reel) => (
            <MobileReelCard key={reel.id} reel={reel} />
          ))}
        </div>
      </div>
    </div>
  );
}
