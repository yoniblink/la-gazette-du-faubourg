import type { SVGProps } from "react";

/**
 * Navigation carrousels (À la une, flipbook, reels) : uniquement le chevron, sans pastille ni ombre.
 * Zone tactile min ~44px pour le mobile ; pas de fond ni bordure visibles.
 */
export const publicExternalNavButtonClass =
  "relative z-30 flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[#ccc9b8] shadow-none backdrop-blur-0 transition-colors duration-200 hover:text-[#aea896] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#aea896]/35 active:opacity-80 md:h-12 md:min-h-[48px] md:w-12 md:min-w-[48px]";

/** Espace réservé quand prev/next est masqué (flipbook) — même emprise que le contrôle chevron. */
export const publicExternalNavSlotClass =
  "h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 md:h-12 md:min-h-[48px] md:w-12 md:min-w-[48px]";

type NavChevronIconProps = SVGProps<SVGSVGElement> & {
  direction: "left" | "right";
};

/**
 * Chevron identique à NavChevronIcon pour injection `innerHTML` (carrousel paires article).
 * Tailles = flipbook Accueil (`h-5` / `md:h-[22px]`).
 */
export const pairCarouselNavSvg = {
  prev: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" class="relative h-5 w-5 md:h-[22px] md:w-[22px]"><path d="M15.5 5.5L8 12L15.5 18.5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  next: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" class="relative h-5 w-5 md:h-[22px] md:w-[22px]"><path d="M8.5 5.5L16 12L8.5 18.5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
} as const;

/** Chevron épais (repère visuel type >), trait arrondi, couleur via `currentColor` sur le parent. */
export function NavChevronIcon({ direction, className, ...rest }: NavChevronIconProps) {
  const d = direction === "right" ? "M8.5 5.5L16 12L8.5 18.5" : "M15.5 5.5L8 12L15.5 18.5";
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className} {...rest}>
      <path
        d={d}
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
