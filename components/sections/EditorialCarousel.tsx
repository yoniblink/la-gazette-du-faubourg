"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FeaturedItem } from "@/lib/content/featured-item";

const EDITORIAL_EASE = [0.43, 0.13, 0.23, 0.96] as const;
const AUTOPLAY_MS = 4000;
const TRANSITION_S = 0.32;
/** Aligné sur `md:w-[72px]` + `md:gap-2` (8px) pour le scroll auto des vignettes */
const THUMB_W_MD = 72;
const THUMB_GAP_MD = 8;

type Props = { items: FeaturedItem[] };

export function EditorialCarousel({ items }: Props) {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const thumbRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const el = thumbRef.current;
    if (!el) return;
    const scroll = Math.max(0, (activeIndex - 1) * (THUMB_W_MD + THUMB_GAP_MD));
    el.scrollTo({ left: scroll, behavior: "smooth" });
  }, [activeIndex]);

  const tEnter = reduceMotion ? 0.1 : TRANSITION_S;
  const linkProps = external
    ? { target: "_blank" as const, rel: "noopener noreferrer" as const }
    : {};

  return (
    <div
      role="region"
      aria-roledescription="carrousel"
      aria-label="Articles à la une"
      className="relative w-full overflow-hidden rounded-sm bg-[#060606] text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] aspect-[4/5] min-h-[360px] md:aspect-[1200/645] md:min-h-[280px] lg:min-h-[320px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
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
      <div className="pointer-events-none absolute right-5 top-5 z-[3] text-right md:right-8 md:top-8">
        <p className="font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-white/65 md:text-[11px]">
          {active.layout === "lead" ? "À la une" : "Reportage"}
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
            className="pointer-events-none text-center"
          >
            <h3 className="font-[family-name:var(--font-serif)] text-[1.35rem] font-light uppercase leading-[1.12] tracking-[0.06em] text-white [text-shadow:0_2px_28px_rgba(0,0,0,0.45)] sm:text-2xl md:text-3xl lg:text-[2.5rem]">
              {active.title}
            </h3>
            <p className="mx-auto mt-5 max-w-xl font-[family-name:var(--font-sans)] text-[13px] leading-relaxed text-white/88 md:text-[15px]">
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

      {/* Navigation — milieu vertical, bords gauche / droite */}
      <motion.button
        type="button"
        aria-label="Article précédent"
        whileHover={reduceMotion ? {} : { scale: 1.02 }}
        whileTap={reduceMotion ? {} : { scale: 0.98 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          prev();
        }}
        className="absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.12] bg-black/5 text-white/55 opacity-80 backdrop-blur-[1px] transition-all duration-200 hover:border-white/22 hover:bg-black/15 hover:text-white/90 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-white/30 md:left-5 md:h-10 md:w-10 lg:left-7"
      >
        <span className="absolute inset-0 rounded-full border border-white/[0.06]" aria-hidden />
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
      <motion.button
        type="button"
        aria-label="Article suivant"
        whileHover={reduceMotion ? {} : { scale: 1.02 }}
        whileTap={reduceMotion ? {} : { scale: 0.98 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          next();
        }}
        className="absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.12] bg-black/5 text-white/55 opacity-80 backdrop-blur-[1px] transition-all duration-200 hover:border-white/22 hover:bg-black/15 hover:text-white/90 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-white/30 md:right-5 md:h-10 md:w-10 lg:right-7"
      >
        <span className="absolute inset-0 rounded-full border border-white/[0.06]" aria-hidden />
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

      {/* Vignettes — desktop, centrées en bas */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 hidden md:flex md:justify-center md:pb-0">
        <div
          ref={thumbRef}
          className="pointer-events-auto flex max-w-[min(100%,calc(100%-1.5rem))] gap-2 overflow-x-auto scroll-smooth px-3 md:max-w-[min(100%,420px)] md:gap-2 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map((item, i) => {
            const isActive = i === activeIndex;
            return (
              <motion.button
                key={item.id}
                type="button"
                aria-label={`Afficher ${item.title}`}
                aria-current={isActive ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goTo(i);
                }}
                whileHover={reduceMotion ? {} : { y: -2 }}
                className={`relative h-[40px] w-[64px] flex-shrink-0 overflow-hidden rounded-md border transition-colors md:h-[44px] md:w-[72px] md:rounded-lg ${
                  isActive
                    ? "border-white/70 ring-1 ring-white/35"
                    : "border-white/10 opacity-90 hover:border-white/35"
                }`}
              >
                <Image
                  src={item.imageSrc}
                  alt=""
                  fill
                  sizes="72px"
                  className="object-cover"
                  style={{ objectPosition: item.imageObjectPosition ?? "50% 50%" }}
                />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Indicateur mobile (points) */}
      <div
        className="absolute bottom-5 right-5 z-20 flex gap-2 md:hidden"
        role="tablist"
        aria-label="Choisir un article"
      >
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            aria-label={`${i + 1} sur ${n}`}
            onClick={(e) => {
              e.stopPropagation();
              goTo(i);
            }}
            className={`h-1.5 rounded-full transition-all ${
              i === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
