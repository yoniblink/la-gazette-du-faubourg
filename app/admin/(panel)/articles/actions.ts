"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ArticleLayout, ArticleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { requireAdmin } from "@/lib/server/admin-auth";
import { emptyTipTapDoc } from "@/lib/tiptap/empty-doc";

export type ArticleActionResult = { ok: true } | { ok: false; error: string };

const articleFormSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  kicker: z.string().optional(),
  excerpt: z.string().min(1),
  coverImageUrl: z.string().min(1),
  coverImageAlt: z.string().min(1),
  categoryId: z.string().min(1),
  authorName: z.string().min(1),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  sourceUrl: z.string().optional(),
  layout: z.enum(["lead", "standard"]),
  featuredOnHome: z.boolean(),
  featuredSortOrder: z.coerce.number().int(),
});

function optStr(v: FormDataEntryValue | null): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

function revalidateArticlePaths(categorySlug: string, articleSlug: string) {
  revalidatePath("/admin/articles");
  revalidatePath("/", "layout");
  revalidatePath(`/${categorySlug}`);
  revalidatePath(`/${categorySlug}/${articleSlug}`);
}

export async function createArticle(_prev: ArticleActionResult | null, formData: FormData): Promise<ArticleActionResult> {
  try {
    await requireAdmin();
    let content: object = emptyTipTapDoc as object;
    const rawContent = formData.get("content");
    if (typeof rawContent === "string" && rawContent.trim()) {
      try {
        content = JSON.parse(rawContent) as object;
      } catch {
        return { ok: false, error: "Contenu JSON invalide" };
      }
    }

    const publish = formData.get("publish") === "on" || formData.get("publish") === "true";
    const featuredOnHome =
      formData.get("featuredOnHome") === "on" || formData.get("featuredOnHome") === "true";

    const raw = {
      title: String(formData.get("title") ?? ""),
      slug: optStr(formData.get("slug")),
      kicker: optStr(formData.get("kicker")),
      excerpt: String(formData.get("excerpt") ?? ""),
      coverImageUrl: String(formData.get("coverImageUrl") ?? ""),
      coverImageAlt: String(formData.get("coverImageAlt") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      authorName: optStr(formData.get("authorName")) ?? "La Gazette",
      seoTitle: optStr(formData.get("seoTitle")),
      seoDescription: optStr(formData.get("seoDescription")),
      sourceUrl: optStr(formData.get("sourceUrl")),
      layout: formData.get("layout") === "lead" ? "lead" : "standard",
      featuredOnHome,
      featuredSortOrder: formData.get("featuredSortOrder") ?? "0",
    };

    const parsed = articleFormSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
    }

    const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
    if (!category) return { ok: false, error: "Rubrique introuvable" };

    const { slug: slugInput, ...rest } = parsed.data;
    const slug = slugInput?.trim() || slugify(parsed.data.title);
    const status = publish ? ArticleStatus.PUBLISHED : ArticleStatus.DRAFT;
    const publishedAt = publish ? new Date() : null;

    await prisma.article.create({
      data: {
        title: rest.title,
        slug,
        kicker: rest.kicker || null,
        excerpt: rest.excerpt,
        coverImageUrl: rest.coverImageUrl,
        coverImageAlt: rest.coverImageAlt,
        content,
        categoryId: rest.categoryId,
        authorName: rest.authorName,
        seoTitle: rest.seoTitle || null,
        seoDescription: rest.seoDescription || null,
        sourceUrl: rest.sourceUrl || null,
        layout: rest.layout === "lead" ? ArticleLayout.lead : ArticleLayout.standard,
        featuredOnHome: rest.featuredOnHome,
        featuredSortOrder: rest.featuredSortOrder,
        status,
        publishedAt,
      },
    });

    revalidateArticlePaths(category.slug, slug);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur";
    if (msg.includes("Unique constraint")) {
      return { ok: false, error: "Ce slug existe déjà dans cette rubrique." };
    }
    return { ok: false, error: msg };
  }
}

export async function updateArticle(_prev: ArticleActionResult | null, formData: FormData): Promise<ArticleActionResult> {
  try {
    await requireAdmin();
    const id = formData.get("id");
    if (typeof id !== "string" || !id) return { ok: false, error: "ID manquant" };

    const existing = await prisma.article.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!existing) return { ok: false, error: "Article introuvable" };

    let content: object = existing.content as object;
    const rawContent = formData.get("content");
    if (typeof rawContent === "string" && rawContent.trim()) {
      try {
        content = JSON.parse(rawContent) as object;
      } catch {
        return { ok: false, error: "Contenu JSON invalide" };
      }
    }

    const publish = formData.get("publish") === "on" || formData.get("publish") === "true";
    const featuredOnHome =
      formData.get("featuredOnHome") === "on" || formData.get("featuredOnHome") === "true";

    const raw = {
      title: String(formData.get("title") ?? ""),
      slug: optStr(formData.get("slug")),
      kicker: optStr(formData.get("kicker")),
      excerpt: String(formData.get("excerpt") ?? ""),
      coverImageUrl: String(formData.get("coverImageUrl") ?? ""),
      coverImageAlt: String(formData.get("coverImageAlt") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      authorName: optStr(formData.get("authorName")) ?? "La Gazette",
      seoTitle: optStr(formData.get("seoTitle")),
      seoDescription: optStr(formData.get("seoDescription")),
      sourceUrl: optStr(formData.get("sourceUrl")),
      layout: formData.get("layout") === "lead" ? "lead" : "standard",
      featuredOnHome,
      featuredSortOrder: formData.get("featuredSortOrder") ?? "0",
    };

    const parsed = articleFormSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
    }

    const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
    if (!category) return { ok: false, error: "Rubrique introuvable" };

    const { slug: slugInput, ...rest } = parsed.data;
    const slug = slugInput?.trim() || slugify(parsed.data.title);
    const status = publish ? ArticleStatus.PUBLISHED : ArticleStatus.DRAFT;
    const publishedAt = publish ? (existing.publishedAt ?? new Date()) : null;

    await prisma.article.update({
      where: { id },
      data: {
        title: rest.title,
        slug,
        kicker: rest.kicker || null,
        excerpt: rest.excerpt,
        coverImageUrl: rest.coverImageUrl,
        coverImageAlt: rest.coverImageAlt,
        content,
        categoryId: rest.categoryId,
        authorName: rest.authorName,
        seoTitle: rest.seoTitle || null,
        seoDescription: rest.seoDescription || null,
        sourceUrl: rest.sourceUrl || null,
        layout: rest.layout === "lead" ? ArticleLayout.lead : ArticleLayout.standard,
        featuredOnHome: rest.featuredOnHome,
        featuredSortOrder: rest.featuredSortOrder,
        status,
        publishedAt,
      },
    });

    revalidateArticlePaths(category.slug, slug);
    if (existing.slug !== slug || existing.category.slug !== category.slug) {
      revalidatePath(`/${existing.category.slug}/${existing.slug}`);
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur";
    if (msg.includes("Unique constraint")) {
      return { ok: false, error: "Ce slug existe déjà dans cette rubrique." };
    }
    return { ok: false, error: msg };
  }
}

export async function deleteArticle(id: string): Promise<ArticleActionResult> {
  try {
    await requireAdmin();
    const row = await prisma.article.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!row) return { ok: false, error: "Article introuvable" };
    await prisma.article.delete({ where: { id } });
    revalidatePath("/admin/articles");
    revalidatePath("/", "layout");
    revalidatePath(`/${row.category.slug}`);
    revalidatePath(`/${row.category.slug}/${row.slug}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}
