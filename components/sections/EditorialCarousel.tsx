"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FeaturedItem } from "@/lib/content/featured-item";

const EDITORIAL_EASE = [0.43, 0.13, 0.23, 0.96] as const;
const AUTOPLAY_MS = 4000;
const TRANSITION_S = 0.32;
const SIDE_LINE_S = 0.36;

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
    const w = 116;
    const gap = 16;
    const scroll = Math.max(0, (activeIndex - 1) * (w + gap));
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

      {/* Titre vertical latéral */}
      <div
        className="pointer-events-none absolute left-5 top-1/2 z-[3] hidden -translate-y-1/2 flex-col items-center gap-5 md:left-8 lg:flex"
        aria-hidden
      >
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: SIDE_LINE_S, ease: EDITORIAL_EASE }}
          className="h-16 w-px origin-bottom bg-white/50"
        />
        <span className="max-h-[160px] overflow-hidden text-ellipsis font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.22em] text-white/85 [writing-mode:vertical-rl] [text-orientation:mixed]">
          {active.rubrique}
        </span>
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: SIDE_LINE_S, ease: EDITORIAL_EASE }}
          className="h-16 w-px origin-top bg-white/50"
        />
      </div>

      {/* Contenu central */}
      <div className="absolute left-1/2 top-1/2 z-[2] w-[88%] max-w-[640px] -translate-x-1/2 -translate-y-1/2 md:left-[calc(50%+28px)] md:w-[75%] md:max-w-[720px] lg:left-1/2 lg:w-[90%]">
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

      {/* Navigation */}
      <div className="absolute bottom-5 left-5 z-20 flex items-center gap-3 md:bottom-8 md:left-8 md:gap-5">
        <motion.button
          type="button"
          aria-label="Article précédent"
          whileHover={reduceMotion ? {} : { scale: 1.06 }}
          whileTap={reduceMotion ? {} : { scale: 0.96 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            prev();
          }}
          className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/35 bg-black/20 text-white backdrop-blur-sm transition-colors hover:border-white/60 md:h-14 md:w-14"
        >
          <span className="absolute inset-0 rounded-full border border-white/15 md:h-14 md:w-14" aria-hidden />
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="relative" aria-hidden>
            <path
              d="M12 4L6 10L12 16"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.button>
        <motion.button
          type="button"
          aria-label="Article suivant"
          whileHover={reduceMotion ? {} : { scale: 1.06 }}
          whileTap={reduceMotion ? {} : { scale: 0.96 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            next();
          }}
          className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/35 bg-black/20 text-white backdrop-blur-sm transition-colors hover:border-white/60 md:h-14 md:w-14"
        >
          <span className="absolute inset-0 rounded-full border border-white/15 md:h-14 md:w-14" aria-hidden />
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="relative" aria-hidden>
            <path
              d="M8 4L14 10L8 16"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.button>
      </div>

      {/* Vignettes — desktop */}
      <div
        ref={thumbRef}
        className="absolute bottom-5 right-0 z-20 hidden max-w-[calc(100%-8rem)] gap-3 overflow-x-auto scroll-smooth px-2 md:flex md:max-w-[min(100%,480px)] md:gap-4 md:px-0 md:pr-6 [&::-webkit-scrollbar]:hidden"
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
              className={`relative h-[52px] w-[88px] flex-shrink-0 overflow-hidden rounded-lg border transition-colors md:h-[68px] md:w-[116px] md:rounded-xl ${
                isActive
                  ? "border-white/75 ring-2 ring-white/40"
                  : "border-white/10 opacity-90 hover:border-white/35"
              }`}
            >
              <Image
                src={item.imageSrc}
                alt=""
                fill
                sizes="116px"
                className="object-cover"
                style={{ objectPosition: item.imageObjectPosition ?? "50% 50%" }}
              />
            </motion.button>
          );
        })}
      </div>

      {/* Indicateur mobile (points) — côté droit pour laisser les flèches à gauche */}
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
