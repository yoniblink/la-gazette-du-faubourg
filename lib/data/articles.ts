import { cache } from "react";
import type { Article, Category } from "@prisma/client";
import { getArticleBySlugs, getArticlesForRubrique } from "@/lib/content/rubrique-articles";
import { getRubriqueBySlug } from "@/lib/content/rubriques";
import { paragraphsToTipTapDoc } from "@/lib/tiptap/empty-doc";
import { tryPrisma } from "@/lib/prisma";

/** Rubrique listing row (DB or static). */
export type RubriqueArticleListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
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
    category: { title: a.rubrique, slug: categorySlug },
  }));
}

export const getPublishedArticlesByCategorySlug = cache(
  async (categorySlug: string): Promise<RubriqueArticleListItem[]> => {
    const db = tryPrisma();
    if (db) {
      const rows = await db.article.findMany({
        where: {
          status: "PUBLISHED",
          category: { slug: categorySlug },
        },
        orderBy: { publishedAt: "desc" },
        include: { category: { select: { title: true, slug: true } } },
      });
      return rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt,
        category: r.category,
      }));
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
    categoryId: cat.id,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
  return { ...article, category: cat };
}

export const getPublishedArticleBySlugs = cache(async (categorySlug: string, articleSlug: string) => {
  const db = tryPrisma();
  if (db) {
    return db.article.findFirst({
      where: {
        slug: articleSlug,
        status: "PUBLISHED",
        category: { slug: categorySlug },
      },
      include: { category: true },
    });
  }
  return staticArticleBySlugs(categorySlug, articleSlug);
});

export const getFeaturedArticlesForHome = cache(async (take = 8) => {
  const db = tryPrisma();
  if (db) {
    return db.article.findMany({
      where: { featuredOnHome: true, status: "PUBLISHED" },
      orderBy: [{ featuredSortOrder: "asc" }, { publishedAt: "desc" }],
      take,
      include: { category: { select: { title: true, slug: true } } },
    });
  }
  return [];
});
