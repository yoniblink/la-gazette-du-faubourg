"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { FeaturedItem } from "@/lib/content/featured-item";
import { NavChevronIcon, publicExternalNavButtonClass } from "@/components/icons/NavChevronIcon";
import { garamondNavItalic } from "@/lib/fonts/garamond-nav";

const EDITORIAL_EASE = [0.43, 0.13, 0.23, 0.96] as const;
const AUTOPLAY_MS = 4000;
const TRANSITION_S = 0.32;

type Props = { items: FeaturedItem[] };

/** Enlève le tiret (cadratin, demi-cadratin ou « - » espacé) avant « Maison … » et le remplace par un saut de ligne. */
function editorialCarouselTitleLines(title: string): ReactNode {
  const re = /(?:\s*[–—]\s*|\s+-\s+)(?=Maison\b)/u;
  const m = title.match(re);
  if (!m || m.index === undefined) return title;
  const before = title.slice(0, m.index).trimEnd();
  const after = title.slice(m.index + m[0].length);
  return (
    <>
      {before}
      <br />
      {after}
    </>
  );
}

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

  return (
    <div
      role="region"
      aria-roledescription="carrousel"
      aria-label="Articles à la une"
      className="relative flex w-full min-w-0 items-center gap-1.5 sm:gap-2 md:gap-4 lg:gap-5 max-[768px]:gap-1"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <motion.button
        type="button"
        aria-label="Article précédent"
        onClick={(e) => {
          e.preventDefault();
          prev();
        }}
        className={publicExternalNavButtonClass}
      >
        <NavChevronIcon direction="left" className="relative h-5 w-5 md:h-[22px] md:w-[22px]" />
      </motion.button>

      <div className="relative min-w-0 flex-1 overflow-hidden rounded-sm bg-[#060606] shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
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
          {active.imageSrc.trim() ? (
            <Image
              src={active.imageSrc.trim()}
              alt={active.imageAlt || ""}
              fill
              sizes="(max-width: 768px) 100vw, 1152px"
              className="object-cover"
              style={{ objectPosition: active.imageObjectPosition ?? "50% 50%" }}
              priority={activeIndex === 0}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/35 via-transparent to-black/10"
        aria-hidden
      />

      {/* Encadré blanc bas — titre & texte lisibles sur l’image (réf. éditoriale luxe) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex justify-center px-3 pb-3 pt-20 sm:px-4 sm:pb-4 sm:pt-24 md:px-6 md:pb-6 md:pt-28">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.id}
            initial={reduceMotion ? {} : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? {} : { opacity: 0, y: 12 }}
            transition={{ duration: tEnter, ease: EDITORIAL_EASE }}
            className="w-full max-w-[min(100%,40rem)] hyphens-auto rounded-sm bg-white/[0.9] px-5 py-5 shadow-[0_8px_40px_rgba(0,0,0,0.12)] backdrop-blur-[2px] [overflow-wrap:break-word] sm:px-7 sm:py-6 md:px-9 md:py-8"
            lang="fr"
          >
            <p
              className={`${garamondNavItalic.className} text-center text-balance text-[17px] font-medium leading-none text-[#111111] [font-synthesis:none] antialiased sm:text-[18px] md:text-[18px] lg:text-[19px] xl:text-[20px]`}
            >
              {active.rubrique}
            </p>
            <h3
              className="mx-auto mt-2.5 w-max max-w-full text-center text-[24px] font-normal italic leading-tight tracking-tight text-black max-[768px]:w-full max-[768px]:text-balance sm:mt-3 sm:text-[26px] md:text-[28px] lg:text-[34px] lg:leading-[1.12]"
              style={{ fontFamily: "Griffiths, serif" }}
            >
              {editorialCarouselTitleLines(active.title)}
            </h3>
            <p
              className="mb-0 mt-4 line-clamp-4 overflow-hidden text-justify text-[18px] font-normal leading-[1.6] text-black text-pretty max-[768px]:leading-[1.55] max-[1024px]:text-[17px] max-[1024px]:leading-[1.58] md:mt-5"
              style={{ fontFamily: "Garamond, serif", letterSpacing: "-0.2px" }}
            >
              {active.excerpt}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Lien article — au-dessus du fond mais sous les controles */}
      <Link
        href={active.href}
        {...linkProps}
        className="absolute inset-0 z-[4] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0a0a0a]/25"
        aria-label={`Lire : ${active.title}`}
      />
      </div>

      <motion.button
        type="button"
        aria-label="Article suivant"
        onClick={(e) => {
          e.preventDefault();
          next();
        }}
        className={publicExternalNavButtonClass}
      >
        <NavChevronIcon direction="right" className="relative h-5 w-5 md:h-[22px] md:w-[22px]" />
      </motion.button>
    </div>
  );
}
