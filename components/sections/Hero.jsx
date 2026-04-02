"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
/** Paragraphe visible dans le hero (identique à la maquette : bloc principal seul avant le CTA). */
const p1 =
  "Il existe à Paris un territoire à part. Un lieu où l’histoire dialogue avec la création, où les savoir-faire se transmettent et se réinventent, où chaque adresse raconte une certaine idée de l’élégance. Le Faubourg Saint-Honoré est de ceux-là. La Gazette du Faubourg s’inscrit dans cette singularité. Média de presse, à la fois imprimé et digital, elle propose un regard éditorial dédié à l’actualité, aux savoir-faire et à l’art de vivre du Faubourg Saint-Honoré. Voix officielle du Comité du Faubourg Saint-Honoré, elle accompagne et met en lumière ses membres, leurs maisons et les initiatives qui participent au rayonnement du quartier.";

const p2 =
  "Pensée comme un magazine de récit et de transmission, La Gazette du Faubourg explore l’horlogerie, la joaillerie, la mode, les arts, la culture et l’art de vivre, en accordant une attention particulière aux parcours, aux gestes et aux lieux qui façonnent l’identité du Faubourg. Une approche éditoriale sensible et contemporaine, entre héritage et modernité.";

const p3 =
  "À travers ses pages imprimées et digitales, La Gazette du Faubourg s’adresse à celles et ceux qui souhaitent comprendre ce qui se cache derrière les vitrines, découvrir les femmes et les hommes qui font vivre ce territoire d’exception et porter un regard attentif sur un quartier où l’excellence se cultive au quotidien.";

const ACCORDION_OPEN_MS = 900;
const ACCORDION_CLOSE_MS = 1300;
const accordionEase = "cubic-bezier(0.22, 1, 0.36, 1)";

const heroInlineNavLinks = [
  { href: "/actualites", label: "Actualités" },
  { href: "/horlogerie-joaillerie", label: "Horlogerie / Joaillerie" },
  { href: "/mode", label: "Mode" },
  { href: "/art-culture", label: "Art & Culture" },
  { href: "/gastronomie", label: "Gastronomie" },
  { href: "/rencontres", label: "Rencontres" },
  { href: "/la-revue", label: "La Revue" },
];

const heroNavLinkClass = [
  "font-garamond-italic",
  "inline-block whitespace-nowrap px-[4px] py-[15px] text-[17px] font-medium leading-none text-black antialiased hover:opacity-80 md:px-[5px] md:text-[17px] lg:text-[18px] xl:text-[19px]",
].join(" ");

/** Corps de chapô : Garamond, justifié, interligne large type print (cf. maquette). */
const bodyStyle = {
  fontFamily: "Garamond, serif",
  letterSpacing: "-0.2px",
};

/** Arrondi sub-pixel pour la largeur chapô = largeur du titre. */
const CHAPO_TITLE_WIDTH_ROUND = 10;

/**
 * Hero « La Gazette du Faubourg » — calé sur la capture / Elementor (~45% texte / ~55% visuel en desktop).
 *
 * Layout :
 * - Mobile : `flex flex-col` — ordre DOM = logo/menu → illustration → texte (stack « logique » demandé).
 * - Desktop (`lg`, 1024px — assorti à `max-[1024px]:`) : `grid` 2 colonnes `9fr / 11fr`, 2 lignes ; l’image `row-span-2` pour occuper toute la hauteur
 *   du bloc texte, comme sur la maquette. Le texte reste visuellement sous le menu (`mt-1` entre les deux lignes gauches).
 * - `max-w-[1400px]` : largeur utile magazine (pas full-bleed).
 * - Chapô : le bloc justifié prend la même largeur que le titre (H1), mesurée au layout (ResizeObserver).
 * - Bloc vertical (desktop) : lg:pt-16 / xl:pt-20, gap-y-0 entre menu et chapô — sans bande vide en tête (header home masqué).
 * - Illustration : colonne droite, largeur max bornée.
 * - Ne pas écrire en commentaire des pseudo-classes Tailwind arbitraires suivies de utilitaires margin : le scan Tailwind v4 peut générer du CSS invalide.
 */
export function Hero() {
  const [open, setOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const chapoTitleRef = useRef(null);
  const [chapoCopyWidthPx, setChapoCopyWidthPx] = useState(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useLayoutEffect(() => {
    const el = chapoTitleRef.current;
    if (!el) return;
    const measure = () => {
      const { width } = el.getBoundingClientRect();
      setChapoCopyWidthPx(Math.round(width * CHAPO_TITLE_WIDTH_ROUND) / CHAPO_TITLE_WIDTH_ROUND);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section id="intro" className="scroll-mt-24 bg-white text-black">
      <div className="mx-auto w-full max-w-[1400px]">
        <div
          className="flex w-full flex-col max-lg:pt-[max(2.5rem,env(safe-area-inset-top,0px))] max-[768px]:px-[10px] max-[1024px]:pb-[50px] px-4 md:px-10 lg:grid lg:grid-cols-[minmax(0,9fr)_minmax(0,11fr)] lg:grid-rows-[auto_auto] lg:items-center lg:gap-x-10 lg:gap-y-0 xl:gap-x-14 lg:pb-16 lg:pt-16 xl:pt-20"
        >
            {/* Logo + menu : rangée 1 colonne 1 en desktop ; premier bloc en mobile. */}
            <div
              id="intro-primary-nav"
              className="flex min-w-0 flex-col items-stretch text-left lg:col-start-1 lg:row-start-1 lg:items-center lg:text-center lg:-mt-16 xl:-mt-20"
            >
              <Link href="/" className="inline-block max-[768px]:w-full lg:mx-auto">
                <Image
                  src="/la-gazette-du-faubourg-logo.png"
                  alt="La Gazette du Faubourg"
                  width={1200}
                  height={337}
                  className="h-auto w-[min(100%,460px)] max-w-full max-[768px]:w-full xl:w-[480px]"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 90vw, 480px"
                  priority
                />
              </Link>

              <nav aria-label="Navigation Hero" className="mt-2 w-full max-[768px]:mt-4 md:mt-3 lg:mt-4 lg:flex lg:justify-center">
                <ul className="flex max-md:flex-wrap max-md:gap-y-2 max-md:justify-center md:flex-nowrap md:justify-center md:gap-x-1 md:pb-0 lg:gap-x-1.5 xl:gap-x-2">
                  {heroInlineNavLinks.map((link) => (
                    <li key={link.href} className="shrink-0">
                      <Link href={link.href} className={`${heroNavLinkClass} max-[768px]:flex max-[768px]:min-h-[44px] max-[768px]:items-center max-[768px]:justify-center max-[768px]:whitespace-normal max-[768px]:px-2 max-[768px]:py-3 max-[768px]:text-center max-[768px]:leading-snug`}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            {/* Illustration : colonne 2, deux rangées en desktop ; placée entre menu et texte en mobile. */}
            <div
              className="flex min-h-0 min-w-0 flex-col justify-center max-lg:-mt-6 max-[1024px]:mb-[-40px] max-[768px]:mb-[-80px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:justify-center lg:pr-4 xl:pr-8"
            >
              <div className="w-full text-center lg:flex lg:justify-end lg:text-right">
                <Image
                  src="/aquarelle-gazette-hero.png"
                  alt="Illustration aquarelle — La Gazette du Faubourg"
                  width={1096}
                  height={1200}
                  data-no-zoom="true"
                  className="ml-auto mr-auto inline-block h-[600px] w-auto max-w-full object-contain object-center max-lg:h-[min(76vh,760px)] max-lg:object-[center_22%] max-[768px]:h-[min(62vh,460px)] max-[768px]:w-full lg:mr-0 lg:h-[min(92vh,1200px)] lg:w-auto lg:max-w-[min(100%,980px)] lg:object-right lg:translate-x-8 lg:translate-y-4 xl:max-w-[min(100%,1100px)] xl:translate-x-12 xl:translate-y-5"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 92vw, 58vw"
                  priority
                  draggable={false}
                />
              </div>
            </div>

            {/* Chapô + CTA : rangée 2 colonne 1 en desktop ; dernier bloc en mobile après l’image. */}
            <div
              className="flex min-h-0 min-w-0 flex-col justify-center max-lg:-mt-8 max-[768px]:pb-[50px] max-[768px]:pt-0 max-[1024px]:pb-[50px] max-[1024px]:pt-0 lg:col-start-1 lg:row-start-2 lg:items-center lg:-mt-28 lg:pt-0 xl:-mt-32"
            >
              <div className="mx-auto w-full max-w-full max-[768px]:mb-[10px]">
                <h1
                  ref={chapoTitleRef}
                  className="mx-auto mb-8 w-max max-w-full text-center text-[34px] font-normal italic leading-tight tracking-tight text-black max-[768px]:w-full max-[768px]:text-balance lg:mb-10 lg:text-[48px] lg:leading-[1.12]"
                  style={{ fontFamily: "Griffiths, serif" }}
                >
                  Découvrez la Gazette du Faubourg
                </h1>

                <div
                  className="mx-auto text-justify text-[18px] font-normal leading-[1.6] text-black text-pretty max-[768px]:leading-[1.55] max-[1024px]:text-[17px] max-[1024px]:leading-[1.58]"
                  style={{
                    ...bodyStyle,
                    width: chapoCopyWidthPx != null ? `${chapoCopyWidthPx}px` : "100%",
                    maxWidth: "100%",
                  }}
                >
                  <p className="mb-0">{p1}</p>

                  <div className="mt-4 w-full max-w-full text-left">
                    <button
                      type="button"
                      id="hero-read-more-trigger"
                      aria-expanded={open}
                      aria-controls="hero-read-more-panel"
                      onClick={() => setOpen((v) => !v)}
                      className="font-garamond-italic border-0 bg-transparent p-0 text-left text-[18px] font-normal italic text-black antialiased [font-synthesis:none] hover:opacity-80 max-[768px]:min-h-[44px] max-[768px]:py-2"
                    >
                      {open ? (
                        <span>
                          Réduire <span aria-hidden>↑</span>
                        </span>
                      ) : (
                        <span>...Lire la suite →</span>
                      )}
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
                        <div className="space-y-5 pt-4 text-justify text-[18px] leading-[1.6] max-[1024px]:text-[17px] max-[1024px]:leading-[1.58]">
                          <p>{p2}</p>
                          <p>{p3}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </section>
  );
}
