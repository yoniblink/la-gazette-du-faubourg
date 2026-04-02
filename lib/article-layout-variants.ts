/** Articles publics avec mise en page « colonne magazine » (pleine largeur empilée, filets, etc.). */
const MAGAZINE_COLUMN_SLUGS = new Set(["hotel-de-crillon-a-rosewood-hotel"]);

export function isMagazineColumnArticle(articleSlug: string): boolean {
  return MAGAZINE_COLUMN_SLUGS.has(articleSlug);
}
