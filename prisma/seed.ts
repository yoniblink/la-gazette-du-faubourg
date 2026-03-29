import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, ArticleLayout, ArticleStatus } from "@prisma/client";
import { rubriqueArticlesBySlug } from "../lib/content/rubrique-articles";
import type { RubriqueSiteArticle, RubriqueSlug } from "../lib/content/types";
import { paragraphsToTipTapDoc } from "../lib/tiptap/empty-doc";

const prisma = new PrismaClient();

const categoriesSeed = [
  {
    slug: "actualite",
    title: "Actualité",
    tagline: "Le Faubourg en mouvement",
    description:
      "Les temps forts, les ouvertures et les regards qui rythment le quartier et l’univers du luxe.",
    imageSrc:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000&auto=format&fit=crop",
    imageAlt: "Façades élégantes, perspective urbaine",
    sortOrder: 0,
    showInMainNav: true,
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
    sortOrder: 1,
    showInMainNav: true,
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
    sortOrder: 2,
    showInMainNav: true,
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
    sortOrder: 3,
    showInMainNav: true,
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
    sortOrder: 4,
    showInMainNav: true,
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
    sortOrder: 5,
    showInMainNav: true,
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
    sortOrder: 6,
    showInMainNav: false,
  },
] as const;

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL?.trim() || "admin@lagazettedufaubourg.local").toLowerCase();
  const password = (process.env.ADMIN_PASSWORD ?? "changeme").trim();
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.upsert({
    where: { email },
    create: { email, passwordHash, name: "Administrateur" },
    update: { passwordHash },
  });
  console.log(`Admin user: ${email} (set ADMIN_EMAIL / ADMIN_PASSWORD to override)`);
}

function articleFieldsFromRubriqueArticle(
  a: RubriqueSiteArticle,
  extras: { featuredOnHome?: boolean; featuredSortOrder?: number } = {},
) {
  const publishedAt = new Date();
  return {
    slug: a.articleSlug,
    title: a.title,
    kicker: a.kicker ?? null,
    excerpt: a.excerpt,
    coverImageUrl: a.imageSrc,
    coverImageAlt: a.imageAlt,
    content: paragraphsToTipTapDoc(a.body) as object,
    status: ArticleStatus.PUBLISHED,
    publishedAt,
    authorName: "La Gazette",
    seoTitle: null as string | null,
    seoDescription: a.excerpt,
    sourceUrl: a.sourceUrl,
    layout: a.layout === "lead" ? ArticleLayout.lead : ArticleLayout.standard,
    featuredOnHome: extras.featuredOnHome ?? false,
    featuredSortOrder: extras.featuredSortOrder ?? 0,
  };
}

async function main() {
  for (const c of categoriesSeed) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: { ...c },
      update: {
        title: c.title,
        tagline: c.tagline,
        description: c.description,
        imageSrc: c.imageSrc,
        imageAlt: c.imageAlt,
        sortOrder: c.sortOrder,
        showInMainNav: c.showInMainNav,
      },
    });
  }
  console.log(`Seeded ${categoriesSeed.length} categories.`);

  const bySlug = await prisma.category.findMany();
  const catId = (slug: string) => {
    const x = bySlug.find((k) => k.slug === slug);
    if (!x) throw new Error(`Missing category ${slug}`);
    return x.id;
  };

  const entries = Object.entries(rubriqueArticlesBySlug) as [
    RubriqueSlug,
    RubriqueSiteArticle[],
  ][];
  for (const [rubriqueSlug, articles] of entries) {
    const categoryId = catId(rubriqueSlug);
    for (const a of articles) {
      const fields = articleFieldsFromRubriqueArticle(a);
      await prisma.article.upsert({
        where: {
          categoryId_slug: { categoryId, slug: a.articleSlug },
        },
        create: { ...fields, categoryId },
        update: {
          title: fields.title,
          kicker: fields.kicker,
          excerpt: fields.excerpt,
          coverImageUrl: fields.coverImageUrl,
          coverImageAlt: fields.coverImageAlt,
          content: fields.content,
          status: fields.status,
          publishedAt: fields.publishedAt,
          authorName: fields.authorName,
          seoDescription: fields.seoDescription,
          sourceUrl: fields.sourceUrl,
          layout: fields.layout,
        },
      });
    }
  }
  console.log("Seeded rubrique articles.");

  // Homepage featured (aligned with previous featured.ts)
  const gastroId = catId("gastronomie");
  const hjId = catId("horlogerie-joaillerie");

  const chottinSlug = "christophe-chottin-a-la-tete-de-maison-blossom";
  await prisma.article.upsert({
    where: { categoryId_slug: { categoryId: gastroId, slug: chottinSlug } },
    create: {
      categoryId: gastroId,
      slug: chottinSlug,
      title: "Christophe Chottin à la tête de Maison Blossom",
      excerpt:
        "Au cœur du Faubourg, une table qui affirme une cuisine française sincère et une vision claire de l’hospitalité.",
      coverImageUrl:
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2000&auto=format&fit=crop",
      coverImageAlt: "Salle de restaurant raffinée",
      content: paragraphsToTipTapDoc([
        "Une table signature au cœur du quartier, portée par une vision claire de l’hospitalité et du goût.",
      ]) as object,
      status: ArticleStatus.PUBLISHED,
      publishedAt: new Date(),
      sourceUrl: "https://www.lagazettedufaubourg.fr/christophe-chottin-a-la-tete-de-maison-blossom/",
      layout: ArticleLayout.lead,
      featuredOnHome: true,
      featuredSortOrder: 0,
    },
    update: {
      featuredOnHome: true,
      featuredSortOrder: 0,
      layout: ArticleLayout.lead,
    },
  });

  const apSlug = "une-nouvelle-generationde-quantieme-perpetuel";
  await prisma.article.update({
    where: { categoryId_slug: { categoryId: hjId, slug: apSlug } },
    data: { featuredOnHome: true, featuredSortOrder: 1, layout: ArticleLayout.standard },
  });

  const dynastySlug = "dynasty-pouvoir-heritage-et-magnificence";
  await prisma.article.update({
    where: { categoryId_slug: { categoryId: hjId, slug: dynastySlug } },
    data: { featuredOnHome: true, featuredSortOrder: 2, layout: ArticleLayout.standard },
  });

  await seedAdmin();
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
