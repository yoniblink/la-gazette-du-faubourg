import type { Rubrique } from "./types";

export const rubriques: Rubrique[] = [
  {
    slug: "actualite",
    title: "Actualité",
    tagline: "Le Faubourg en mouvement",
    description:
      "Les temps forts, les ouvertures et les regards qui rythment le quartier et l’univers du luxe.",
    imageSrc:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000&auto=format&fit=crop",
    imageAlt: "Façades élégantes, perspective urbaine",
  },
  {
    slug: "horlogerie-joaillerie",
    title: "Horlogerie / Joaillerie",
    tagline: "Mouvements, matière, lumière",
    description:
      "Au plus près des manufactures et des ateliers : calibres rares, pierres d’exception et savoir-faire transmis.",
    imageSrc:
      "https://images.unsplash.com/photo-1617032213177-503dd1b17a34?q=80&w=2000&auto=format&fit=crop",
    imageAlt: "Gros plan sur un boîtier de montre et détails métalliques",
  },
  {
    slug: "mode",
    title: "Mode",
    tagline: "Silhouettes, matières, intentions",
    description:
      "Créations, inspirations et étiquettes qui définissent une élégance contemporaine, entre héritage et audace mesurée.",
    imageSrc:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=2000&auto=format&fit=crop",
    imageAlt: "Silhouette mode en noir et blanc, studio épuré",
  },
  {
    slug: "art-culture",
    title: "Art & Culture",
    tagline: "Expositions, collections, regards",
    description:
      "Peinture, design, patrimoine : les événements et les figures qui nourrissent une scène culturelle exigeante.",
    imageSrc:
      "https://images.unsplash.com/photo-1545989253-0af2d941402e?q=80&w=2000&auto=format&fit=crop",
    imageAlt: "Galerie d’art minimaliste, œuvres accrochées",
  },
  {
    slug: "gastronomie",
    title: "Gastronomie",
    tagline: "Tables, produits, territoires",
    description:
      "Des tables signatures aux gestes précis en cuisine : le goût du détail et l’art de recevoir.",
    imageSrc:
      "https://images.unsplash.com/photo-1550966873-2003cff0e126?q=80&w=2000&auto=format&fit=crop",
    imageAlt: "Assiette gastronomique élégante, dressage minimal",
  },
  {
    slug: "rencontres",
    title: "Rencontres",
    tagline: "Paroles de créateurs et de femmes et hommes d’exception",
    description:
      "Portraits et entretiens : les parcours, les exigences et les visions qui façonnent le luxe d’aujourd’hui.",
    imageSrc:
      "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?q=80&w=2000&auto=format&fit=crop",
    imageAlt: "Portrait en lumière douce, ambiance studio",
  },
  {
    slug: "la-revue",
    title: "La Revue",
    tagline: "Le magazine, entre papier et écran",
    description:
      "Chaque numéro prolonge l’esprit du Faubourg : récits longs, photographies soignées, attention au détail.",
    imageSrc:
      "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?q=80&w=2000&auto=format&fit=crop",
    imageAlt: "Magazine ouvert sur une table en marbre",
  },
];

/** Rubriques du menu « éditorial » (comme sur le site officiel — La Revue est aussi sous Médias) */
export function rubriquesMenuPrincipal() {
  return rubriques.filter((r) => r.slug !== "la-revue");
}

export function getRubriqueBySlug(slug: string) {
  return rubriques.find((r) => r.slug === slug) ?? null;
}
