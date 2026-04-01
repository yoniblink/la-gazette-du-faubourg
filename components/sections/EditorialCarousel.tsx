"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import type { FeaturedItem } from "@/lib/content/featured-item";

const EDITORIAL_EASE = [0.43, 0.13, 0.23, 0.96] as const;
const AUTOPLAY_MS = 4000;
const TRANSITION_S = 0.32;

type Props = { items: FeaturedItem[] };

export function EditorialCarousel({ items }: Props) {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const n = items.length;
  const active = items[activeIndex]!;
  const external = active.href.startsWith("http");

  const goTo = useCallback(
    (index: number) => {
      if (index === activeIndex || index < 0 || index >= n) return;
      setActiveIndex(index);
    },
    [activeIndex, n],
  );

  const next = useCallback(() => goTo((activeIndex + 1) % n), [activeIndex, goTo, n]);
  const prev = useCallback(() => goTo((activeIndex - 1 + n) % n), [activeIndex, goTo, n]);

  useEffect(() => {
    if (reduceMotion || paused || n <= 1) return;
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % n);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [reduceMotion, paused, n]);

  const tEnter = reduceMotion ? 0.1 : TRANSITION_S;
  const linkProps = external
    ? { target: "_blank" as const, rel: "noopener noreferrer" as const }
    : {};

  const navBtnClass =
    "relative z-30 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/12 bg-white/95 text-[#0a0a0a]/45 shadow-[0_2px_12px_rgba(0,0,0,0.06)] backdrop-blur-[2px] transition-all duration-200 hover:border-black/20 hover:bg-white hover:text-[#0a0a0a]/85 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]/20 md:h-10 md:w-10";

  return (
    <div
      role="region"
      aria-roledescription="carrousel"
      aria-label="Articles à la une"
      className="relative flex w-full items-center gap-1.5 sm:gap-2 md:gap-4 lg:gap-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <motion.button
        type="button"
        aria-label="Article précédent"
        whileHover={reduceMotion ? {} : { scale: 1.02 }}
        whileTap={reduceMotion ? {} : { scale: 0.98 }}
        onClick={(e) => {
          e.preventDefault();
          prev();
        }}
        className={navBtnClass}
      >
        <span className="absolute inset-0 rounded-full border border-black/[0.05]" aria-hidden />
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" className="relative" aria-hidden>
          <path
            d="M12 4L6 10L12 16"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.button>

      <div className="relative min-w-0 flex-1 overflow-hidden rounded-sm bg-[#060606] text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
      {/* Bloc en flux : hauteur non nulle pour les parents des Image fill (évite warning Next) */}
      <div
        className="pointer-events-none w-full max-md:[aspect-ratio:4/5] max-md:min-h-[360px] md:[aspect-ratio:1200/645] md:min-h-[280px] lg:min-h-[320px]"
        aria-hidden
      />
      {/* Image plein cadre */}
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: tEnter, ease: EDITORIAL_EASE }}
          className="absolute inset-0"
        >
          <Image
            src={active.imageSrc}
            alt={active.imageAlt}
            fill
            sizes="(max-width: 768px) 100vw, 1152px"
            className="object-cover"
            style={{ objectPosition: active.imageObjectPosition ?? "50% 50%" }}
            priority={activeIndex === 0}
          />
        </motion.div>
      </AnimatePresence>

      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/25 to-black/30"
        aria-hidden
      />

      {/* Méta coins (style Framer GPS / EXIF → rubrique / mise en avant) */}
      <div className="pointer-events-none absolute left-5 top-5 z-[3] md:left-8 md:top-8">
        <p className="font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-white/65 md:text-[11px]">
          {active.rubrique}
        </p>
      </div>
      {/* Contenu central */}
      <div className="absolute left-1/2 top-1/2 z-[2] w-[88%] max-w-[640px] -translate-x-1/2 -translate-y-1/2 md:w-[75%] md:max-w-[720px] lg:w-[90%]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.id}
            initial={reduceMotion ? {} : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? {} : { opacity: 0, y: -16 }}
            transition={{ duration: tEnter, ease: EDITORIAL_EASE }}
            className="pointer-events-none mx-auto w-full max-w-xl hyphens-auto [overflow-wrap:break-word] [&_h3]:hyphens-manual"
            lang="fr"
          >
            <h3 className="w-full text-left text-balance font-[family-name:var(--font-serif)] text-[1.35rem] font-light uppercase leading-[1.12] tracking-[0.06em] text-white [text-shadow:0_2px_28px_rgba(0,0,0,0.45)] sm:text-2xl md:text-3xl lg:text-[2.5rem]">
              {active.title}
            </h3>
            <p className="mt-5 w-full text-justify text-pretty font-[family-name:var(--font-sans)] text-[13px] leading-relaxed text-white/88 md:text-[15px]">
              {active.excerpt}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Lien article — au-dessus du fond mais sous les controles */}
      <Link
        href={active.href}
        {...linkProps}
        className="absolute inset-0 z-[4] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
        aria-label={`Lire : ${active.title}`}
      />
      </div>

      <motion.button
        type="button"
        aria-label="Article suivant"
        whileHover={reduceMotion ? {} : { scale: 1.02 }}
        whileTap={reduceMotion ? {} : { scale: 0.98 }}
        onClick={(e) => {
          e.preventDefault();
          next();
        }}
        className={navBtnClass}
      >
        <span className="absolute inset-0 rounded-full border border-black/[0.05]" aria-hidden />
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" className="relative" aria-hidden>
          <path
            d="M8 4L14 10L8 16"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.button>
    </div>
  );
}
