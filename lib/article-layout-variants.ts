/** Articles publics avec mise en page « colonne magazine » (pleine largeur empilée, filets, etc.). */
const MAGAZINE_COLUMN_SLUGS = new Set(["hotel-de-crillon-a-rosewood-hotel"]);

/** Suites de `.article-tiptap-pair` consécutifs (y compris `--stack`) → carrousel horizontal. */
const PAIR_CAROUSEL_SLUGS = new Set(["dior-fall-2026"]);

/** Suites de `.article-tiptap-split` consécutifs (2+) → carrousel (opt-in). */
const SPLIT_CAROUSEL_SLUGS = new Set(["reine-de-naples9935-8925"]);

export function isMagazineColumnArticle(articleSlug: string): boolean {
  return MAGAZINE_COLUMN_SLUGS.has(articleSlug);
}

export function isPairCarouselArticle(articleSlug: string): boolean {
  return PAIR_CAROUSEL_SLUGS.has(articleSlug);
}

export function isSplitCarouselArticle(articleSlug: string): boolean {
  return SPLIT_CAROUSEL_SLUGS.has(articleSlug);
}

/** Sections split initiales hors carrousel (intro au-dessus de la galerie). */
export function splitCarouselSkipLeadingSplits(articleSlug: string): number {
  // L’article commence par une série de splits “éditoriaux” (intro + explications),
  // puis termine par une série de splits “montres” qui doit seule passer en carrousel.
  if (articleSlug === "reine-de-naples9935-8925") return 5;
  return 0;
}

/** Exclut du carrousel les splits avec chapô (h1–h3 dans la colonne texte) : restent au-dessus de la galerie. */
export function splitCarouselExcludeHeadingSplits(articleSlug: string): boolean {
  void articleSlug;
  return false;
}
