export type RubriqueSlug =
  | "horlogerie-joaillerie"
  | "mode"
  | "art-culture"
  | "gastronomie"
  | "rencontres"
  | "la-revue";

export type Rubrique = {
  slug: RubriqueSlug;
  title: string;
  tagline: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
};

export type FeaturedArticle = {
  id: string;
  rubrique: string;
  title: string;
  excerpt: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
  layout: "lead" | "standard";
};

/** Article hébergé sur ce site (rubrique / article) */
export type RubriqueSiteArticle = Omit<FeaturedArticle, "href"> & {
  articleSlug: string;
  kicker?: string;
  body: string[];
  sourceUrl: string;
};

export function isRubriqueSiteArticle(
  a: FeaturedArticle | RubriqueSiteArticle,
): a is RubriqueSiteArticle {
  return "articleSlug" in a && typeof (a as RubriqueSiteArticle).articleSlug === "string";
}
