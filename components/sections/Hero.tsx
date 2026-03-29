"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { site } from "@/lib/content/site";
import { easeLux } from "@/lib/motion";

const p1 =
  "Il existe à Paris un territoire à part. Un lieu où l’histoire dialogue avec la création, où les savoir-faire se transmettent et se réinventent, où chaque adresse raconte une certaine idée de l’élégance. Le Faubourg Saint-Honoré est de ceux-là. La Gazette du Faubourg s’inscrit dans cette singularité. Média de presse, à la fois imprimé et digital, elle propose un regard éditorial dédié à l’actualité, aux savoir-faire et à l’art de vivre du Faubourg Saint-Honoré. Voix officielle du Comité du Faubourg Saint-Honoré, elle accompagne et met en lumière ses membres, leurs maisons et les initiatives qui participent au rayonnement du quartier.";

const p2 =
  "Pensée comme un magazine de récit et de transmission, La Gazette du Faubourg explore l’horlogerie, la joaillerie, la mode, les arts, la culture et l’art de vivre, en accordant une attention particulière aux parcours, aux gestes et aux lieux qui façonnent l’identité du Faubourg. Une approche éditoriale sensible et contemporaine, entre héritage et modernité.";

const p3 =
  "À travers ses pages imprimées et digitales, La Gazette du Faubourg s’adresse à celles et ceux qui souhaitent comprendre ce qui se cache derrière les vitrines, découvrir les femmes et les hommes qui font vivre ce territoire d’exception et porter un regard attentif sur un quartier où l’excellence se cultive au quotidien.";

const ACCORDION_OPEN_MS = 900;
/** Repliage plus long : l’interpolation 1fr→0fr paraît plus rapide à durée égale */
const ACCORDION_CLOSE_MS = 1300;

const accordionEase = "cubic-bezier(0.22, 1, 0.36, 1)";

function ChevronDown({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
    >
      <path
        d="M3.5 5.25L7 8.75L10.5 5.25"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Hero() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="intro"
      className="scroll-mt-24 border-b border-black/[0.06] bg-[#fafafa] pt-16 md:pt-20"
    >
      <div className="mx-auto grid max-w-[100rem] grid-cols-1 md:grid-cols-2 md:min-h-[min(100svh,56rem)] md:items-stretch">
        {/* min-h-0 : la ligne de grille peut se réduire au repli du texte (sinon min-height:auto bloque) */}
        <div className="flex min-h-0 flex-col justify-center px-6 py-12 md:px-10 md:py-16 lg:px-14 xl:px-16">
          <div className="w-full max-w-xl self-start">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: easeLux }}
              className="relative h-16 w-full sm:h-[4.75rem] md:h-[5.75rem] lg:h-28 xl:h-32"
            >
              <Image
                src="/logo-comite-faubourg.png"
                alt="Comité du Faubourg Saint-Honoré"
                fill
                className="object-contain object-left"
                sizes="(max-width: 640px) 360px, (max-width: 768px) 420px, (max-width: 1024px) 520px, (max-width: 1280px) 620px, 720px"
                priority
              />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: easeLux, delay: 0.05 }}
              className="mt-4 font-[family-name:var(--font-sans)] text-[10px] font-medium uppercase tracking-[0.28em] text-[#6b6b6b] md:mt-5 md:text-[11px]"
            >
              {site.officialTitle}
            </motion.p>
          </div>

          <div className="mt-8 max-w-xl font-[family-name:var(--font-sans)] text-[15px] leading-[1.82] text-[#3a3a3a] lg:max-w-[28rem] lg:text-[16px]">
            <p>{p1}</p>

            <button
              type="button"
              id="hero-read-more-trigger"
              aria-expanded={open}
              aria-controls="hero-read-more-panel"
              onClick={() => setOpen((v) => !v)}
              className="mt-2 flex w-full items-center justify-between gap-4 border-b border-black/[0.08] py-2.5 text-left font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.22em] text-[#0a0a0a] transition-opacity hover:opacity-60"
            >
              <span>{open ? "Réduire" : "Lire la suite"}</span>
              <ChevronDown
                className={`shrink-0 text-[#0a0a0a] ${open ? "rotate-180" : ""}`}
                style={
                  reduceMotion
                    ? undefined
                    : {
                        transitionProperty: "transform",
                        transitionDuration: open
                          ? `${ACCORDION_OPEN_MS}ms`
                          : `${ACCORDION_CLOSE_MS}ms`,
                        transitionTimingFunction: accordionEase,
                      }
                }
              />
            </button>

            <div
              id="hero-read-more-panel"
              role="region"
              aria-labelledby="hero-read-more-trigger"
              aria-hidden={!open}
              className={`grid ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
              style={
                reduceMotion
                  ? undefined
                  : {
                      transitionProperty: "grid-template-rows",
                      transitionDuration: open
                        ? `${ACCORDION_OPEN_MS}ms`
                        : `${ACCORDION_CLOSE_MS}ms`,
                      transitionTimingFunction: accordionEase,
                    }
              }
            >
              <div className="min-h-0 overflow-hidden">
                <div className="space-y-5 pt-4">
                  <p>{p2}</p>
                  <p>{p3}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative min-h-[min(48svh,22rem)] w-full overflow-visible bg-[#fafafa] md:min-h-0 md:h-full">
          <div className="hero-illustration-float absolute inset-x-3 bottom-0 top-6 md:inset-x-6 md:top-10">
            <Image
              src="/hero-aquarelle-gazette.png"
              alt="Illustration aquarelle — La Gazette du Faubourg"
              fill
              priority
              unoptimized
              sizes="(max-width:768px) 100vw, 50vw"
              className="bg-transparent object-contain object-[center_bottom] md:object-left md:object-bottom [filter:drop-shadow(0_22px_44px_rgba(10,10,10,0.07))]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
