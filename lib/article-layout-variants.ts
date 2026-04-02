/** Articles publics avec mise en page « colonne magazine » (pleine largeur empilée, filets, etc.). */
const MAGAZINE_COLUMN_SLUGS = new Set(["hotel-de-crillon-a-rosewood-hotel"]);

/** Suites de `.article-tiptap-pair` consécutifs (y compris `--stack`) → carrousel horizontal. */
const PAIR_CAROUSEL_SLUGS = new Set(["dior-fall-2026"]);

export function isMagazineColumnArticle(articleSlug: string): boolean {
  return MAGAZINE_COLUMN_SLUGS.has(articleSlug);
}

export function isPairCarouselArticle(articleSlug: string): boolean {
  return PAIR_CAROUSEL_SLUGS.has(articleSlug);
}
