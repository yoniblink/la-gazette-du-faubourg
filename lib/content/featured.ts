import type { FeaturedArticle } from "./types";

export const featuredArticles: FeaturedArticle[] = [
  {
    id: "1",
    rubrique: "Gastronomie",
    title: "Christophe Chottin à la tête de Maison Blossom",
    excerpt:
      "Au cœur du Faubourg, une table qui affirme une cuisine française sincère et une vision claire de l’ hospitalité.",
    imageSrc:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2000&auto=format&fit=crop",
    imageAlt: "Salle de restaurant raffinée",
    href: "https://www.lagazettedufaubourg.fr/christophe-chottin-a-la-tete-de-maison-blossom/",
    layout: "lead",
  },
  {
    id: "2",
    rubrique: "Horlogerie",
    title: "Une nouvelle génération de quantième perpétuel",
    excerpt:
      "Un mouvement qui marque un anniversaire symbolique et repousse le confort d’usage en haute horlogerie.",
    imageSrc:
      "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=1600&auto=format&fit=crop",
    imageAlt: "Montre-bracelet en gros plan",
    href: "https://www.lagazettedufaubourg.fr/une-nouvelle-generationde-quantieme-perpetuel/",
    layout: "standard",
  },
  {
    id: "3",
    rubrique: "Art & Culture",
    title: "Dynasty ! Pouvoir, héritage et magnificence",
    excerpt:
      "Splendeurs des cours et éclat des pierres : une exposition qui dialogue avec l’histoire de la joaillerie.",
    imageSrc:
      "https://images.unsplash.com/photo-1577720643272-265f0936745a?q=80&w=1600&auto=format&fit=crop",
    imageAlt: "Collier et bijoux d’exception en vitrine",
    href: "https://www.lagazettedufaubourg.fr/dynasty-pouvoir-heritage-et-magnificence/",
    layout: "standard",
  },
];
