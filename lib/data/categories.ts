import { cache } from "react";
import type { Category } from "@prisma/client";
import { rubriques, getRubriqueBySlug as getStaticRubriqueBySlug } from "@/lib/content/rubriques";
import { tryPrisma } from "@/lib/prisma";

function staticCategories(): Category[] {
  return rubriques.map((r, i) => ({
    id: `static-${r.slug}`,
    slug: r.slug,
    title: r.title,
    tagline: r.tagline,
    description: r.description,
    imageSrc: r.imageSrc,
    imageAlt: r.imageAlt,
    sortOrder: i,
    showInMainNav: r.slug !== "la-revue",
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }));
}

function staticCategoryBySlug(slug: string): Category | null {
  const r = getStaticRubriqueBySlug(slug);
  if (!r) return null;
  const i = rubriques.findIndex((x) => x.slug === slug);
  return {
    id: `static-${r.slug}`,
    slug: r.slug,
    title: r.title,
    tagline: r.tagline,
    description: r.description,
    imageSrc: r.imageSrc,
    imageAlt: r.imageAlt,
    sortOrder: i >= 0 ? i : 0,
    showInMainNav: r.slug !== "la-revue",
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

export const getCategoriesOrdered = cache(async () => {
  const db = tryPrisma();
  if (db) {
    return db.category.findMany({ orderBy: { sortOrder: "asc" } });
  }
  return staticCategories();
});

export const getCategoryBySlug = cache(async (slug: string) => {
  const db = tryPrisma();
  if (db) {
    return db.category.findUnique({ where: { slug } });
  }
  return staticCategoryBySlug(slug);
});
