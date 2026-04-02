import { cache } from "react";
import type { Article, Category } from "@prisma/client";
import type { RubriqueSlug } from "@/lib/content/types";
import { getArticleBySlugs, getArticlesForRubrique, rubriqueArticlesBySlug } from "@/lib/content/rubrique-articles";
import { getRubriqueBySlug } from "@/lib/content/rubriques";
import { paragraphsToTipTapDoc } from "@/lib/tiptap/empty-doc";
import { DEFAULT_COVER_OBJECT_POSITION } from "@/lib/cover-object-position";
import { tryPrisma } from "@/lib/prisma";
import { resolveArticleCoverFields } from "@/lib/article-cover-resolve";

/** Rubrique « fil » : tous les articles publiés (pas seulement ceux catégorisés « Actualité »). */
export const ACTUALITE_HUB_SLUG = "actualite";

/**
 * Ordre des tuiles sur la page WordPress /actualités/ (Elementor).
 * Les autres articles du fil suivent ensuite (tri date pour la DB).
 */
const ACTUALITES_HUB_MANUAL_ORDER = [
  "une-nouvelle-generationde-quantieme-perpetuel",
  "reine-de-naples9935-8925",
  "dynasty-pouvoir-heritage-et-magnificence",
  "grand-lady-kalla",
  "christophe-chottin-a-la-tete-de-maison-blossom",
  "hotel-de-crillon-a-rosewood-hotel",
  "3-questions-a-john-nollet-directeur-artistique-maison-carita",
  "traits-pour-tres",
] as const;

const ACTUALITES_HUB_RANK = new Map<string, number>(
  ACTUALITES_HUB_MANUAL_ORDER.map((slug, i) => [slug, i]),
);

function actualiteHubSortKey(slug: string): number {
  return ACTUALITES_HUB_RANK.get(slug) ?? ACTUALITES_HUB_MANUAL_ORDER.length;
}

/** Rubrique listing row (DB or static). */
export type RubriqueArticleListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string;
  coverImageAlt: string;
  coverObjectPosition: string;
  category: { title: string; slug: string };
};

function staticArticlesForCategory(categorySlug: string): RubriqueArticleListItem[] {
  const list = getArticlesForRubrique(categorySlug);
  if (!list) return [];
  return list.map((a) => ({
    id: a.id,
    slug: a.articleSlug,
    title: a.title,
    excerpt: a.excerpt,
    coverImageUrl: a.imageSrc,
    coverImageAlt: a.imageAlt,
    coverObjectPosition: DEFAULT_COVER_OBJECT_POSITION,
    category: { title: a.rubrique, slug: categorySlug },
  }));
}

/** Sans DB : tous les articles statiques de toutes les rubriques (pour /actualite). */
function staticAllPublishedForActualiteHub(): RubriqueArticleListItem[] {
  const out: RubriqueArticleListItem[] = [];
  for (const [rubriqueSlug, list] of Object.entries(rubriqueArticlesBySlug) as [
    RubriqueSlug,
    NonNullable<(typeof rubriqueArticlesBySlug)[RubriqueSlug]>,
  ][]) {
    if (rubriqueSlug === "actualite" || !list?.length) continue;
    const rubrique = getRubriqueBySlug(rubriqueSlug);
    if (!rubrique) continue;
    for (const a of list) {
      out.push({
        id: a.id,
        slug: a.articleSlug,
        title: a.title,
        excerpt: a.excerpt,
        coverImageUrl: a.imageSrc,
        coverImageAlt: a.imageAlt,
        coverObjectPosition: DEFAULT_COVER_OBJECT_POSITION,
        category: { title: rubrique.title, slug: rubriqueSlug },
      });
    }
  }
  return out;
}

export const getPublishedArticlesByCategorySlug = cache(
  async (categorySlug: string): Promise<RubriqueArticleListItem[]> => {
    const db = tryPrisma();
    if (db) {
      const isActualiteHub = categorySlug === ACTUALITE_HUB_SLUG;
      const rows = await db.article.findMany({
        where: isActualiteHub
          ? { status: "PUBLISHED" }
          : { status: "PUBLISHED", category: { slug: categorySlug } },
        orderBy: [
          { publishedAt: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        include: { category: { select: { title: true, slug: true, imageSrc: true, imageAlt: true } } },
      });
      if (isActualiteHub) {
        rows.sort((a, b) => {
          const ra = actualiteHubSortKey(a.slug);
          const rb = actualiteHubSortKey(b.slug);
          if (ra !== rb) return ra - rb;
          const da = a.publishedAt?.getTime() ?? a.createdAt.getTime();
          const db = b.publishedAt?.getTime() ?? b.createdAt.getTime();
          return db - da;
        });
      }
      return rows.map((r) => {
        const { coverImageUrl, coverImageAlt } = resolveArticleCoverFields(
          {
            coverImageUrl: r.coverImageUrl,
            coverImageAlt: r.coverImageAlt,
            title: r.title,
            content: r.content,
          },
          { imageSrc: r.category.imageSrc, imageAlt: r.category.imageAlt },
        );
        return {
          id: r.id,
          slug: r.slug,
          title: r.title,
          excerpt: r.excerpt,
          coverImageUrl,
          coverImageAlt,
          coverObjectPosition: r.coverObjectPosition,
          category: { title: r.category.title, slug: r.category.slug },
        };
      });
    }
    if (categorySlug === ACTUALITE_HUB_SLUG) {
      return staticAllPublishedForActualiteHub().sort((a, b) => {
        const ra = actualiteHubSortKey(a.slug);
        const rb = actualiteHubSortKey(b.slug);
        if (ra !== rb) return ra - rb;
        return 0;
      });
    }
    return staticArticlesForCategory(categorySlug);
  },
);

export type PublicArticleWithCategory = Article & { category: Category };

function staticArticleBySlugs(
  categorySlug: string,
  articleSlug: string,
): PublicArticleWithCategory | null {
  const rubrique = getRubriqueBySlug(categorySlug);
  const a = getArticleBySlugs(categorySlug, articleSlug);
  if (!rubrique || !a) return null;
  const content = paragraphsToTipTapDoc(a.body) as object;
  const cat: Category = {
    id: `static-${rubrique.slug}`,
    slug: rubrique.slug,
    title: rubrique.title,
    tagline: rubrique.tagline,
    description: rubrique.description,
    imageSrc: rubrique.imageSrc,
    imageAlt: rubrique.imageAlt,
    sortOrder: 0,
    showInMainNav: rubrique.slug !== "la-revue",
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
  const article: Article = {
    id: a.id,
    slug: a.articleSlug,
    title: a.title,
    kicker: a.kicker ?? null,
    excerpt: a.excerpt,
    coverImageUrl: a.imageSrc,
    coverImageAlt: a.imageAlt,
    content,
    status: "PUBLISHED",
    publishedAt: null,
    authorName: "La Gazette",
    seoTitle: null,
    seoDescription: a.excerpt,
    sourceUrl: a.sourceUrl,
    layout: a.layout,
    featuredOnHome: false,
    featuredSortOrder: 0,
    coverObjectPosition: DEFAULT_COVER_OBJECT_POSITION,
    categoryId: cat.id,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
  return { ...article, category: cat };
}

export const getPublishedArticleBySlugs = cache(async (categorySlug: string, articleSlug: string) => {
  const db = tryPrisma();
  if (db) {
    const row = await db.article.findFirst({
      where: {
        slug: articleSlug,
        status: "PUBLISHED",
        category: { slug: categorySlug },
      },
      include: { category: true },
    });
    if (!row) return null;
    const { coverImageUrl, coverImageAlt } = resolveArticleCoverFields(
      {
        coverImageUrl: row.coverImageUrl,
        coverImageAlt: row.coverImageAlt,
        title: row.title,
        content: row.content,
      },
      { imageSrc: row.category.imageSrc, imageAlt: row.category.imageAlt },
    );
    return { ...row, coverImageUrl, coverImageAlt };
  }
  return staticArticleBySlugs(categorySlug, articleSlug);
});

/** Article (tout statut) pour l’édition admin sur l’URL publique — uniquement Prisma, pas de fallback statique. */
export const getArticleBySlugsForAdmin = cache(async (categorySlug: string, articleSlug: string) => {
  const db = tryPrisma();
  if (!db) return null;
  const row = await db.article.findFirst({
    where: {
      slug: articleSlug,
      category: { slug: categorySlug },
    },
    include: { category: true },
  });
  if (!row) return null;
  const { coverImageUrl, coverImageAlt } = resolveArticleCoverFields(
    {
      coverImageUrl: row.coverImageUrl,
      coverImageAlt: row.coverImageAlt,
      title: row.title,
      content: row.content,
    },
    { imageSrc: row.category.imageSrc, imageAlt: row.category.imageAlt },
  );
  return { ...row, coverImageUrl, coverImageAlt };
});

/** Articles pour le carrousel « L’actualité du Faubourg » : tous les publiés, du plus récent au plus ancien. */
export const getFeaturedArticlesForHome = cache(async (take?: number) => {
  const db = tryPrisma();
  if (db) {
    const rows = await db.article.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [
        { publishedAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      ...(take != null ? { take } : {}),
      include: { category: { select: { title: true, slug: true, imageSrc: true, imageAlt: true } } },
    });
    return rows.map((r) => {
      const { coverImageUrl, coverImageAlt } = resolveArticleCoverFields(
        {
          coverImageUrl: r.coverImageUrl,
          coverImageAlt: r.coverImageAlt,
          title: r.title,
          content: r.content,
        },
        { imageSrc: r.category.imageSrc, imageAlt: r.category.imageAlt },
      );
      return {
        ...r,
        coverImageUrl,
        coverImageAlt,
        category: { title: r.category.title, slug: r.category.slug },
      };
    });
  }
  return [];
});
