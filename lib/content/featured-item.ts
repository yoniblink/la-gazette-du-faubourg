export type FeaturedItem = {
  id: string;
  rubrique: string;
  title: string;
  excerpt: string;
  imageSrc: string;
  imageAlt: string;
  /** CSS object-position pour le recadrage (cartes / carrousel) */
  imageObjectPosition?: string;
  href: string;
  layout: "lead" | "standard";
};
