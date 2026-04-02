import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { ArticleBody } from "@/components/ArticleBody";
import { ArticlePublicLayout } from "@/components/article/ArticlePublicLayout";
import {
  getArticleBySlugsForAdmin,
  getPublishedArticleBySlugs,
} from "@/lib/data/articles";
import { getCategoryBySlug } from "@/lib/data/categories";
import { site } from "@/lib/content/site";
import { prisma } from "@/lib/prisma";
import {
  isMagazineColumnArticle,
  isPairCarouselArticle,
  isSplitCarouselArticle,
  splitCarouselExcludeHeadingSplits,
  splitCarouselSkipLeadingSplits,
} from "@/lib/article-layout-variants";

type Props = {
  params: Promise<{ slug: string; articleSlug: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export const dynamicParams = true;
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, articleSlug } = await params;
  const article = await getPublishedArticleBySlugs(slug, articleSlug);
  if (!article) return {};
  const title = article.seoTitle?.trim() || article.title;
  const description = article.seoDescription?.trim() || article.excerpt;
  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${site.name}`,
      description,
      locale: "fr_FR",
      images: article.coverImageUrl ? [{ url: article.coverImageUrl }] : undefined,
    },
  };
}

export default async function RubriqueArticlePage({ params, searchParams }: Props) {
  const { slug, articleSlug } = await params;
  const { edit } = await searchParams;
  const rubrique = await getCategoryBySlug(slug);
  if (!rubrique) notFound();

  const session = await auth();
  const wantsEdit = edit === "1" || edit === "true";
  const isAdmin = Boolean(session?.user?.email);

  if (wantsEdit && isAdmin) {
    const [fullRow, categories] = await Promise.all([
      getArticleBySlugsForAdmin(slug, articleSlug),
      prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);
    if (!fullRow) notFound();
    const { category: articleCategory, ...article } = fullRow;
    const userEmail = session!.user!.email ?? "";
    const articlesIndexHref = `/admin/articles?rubrique=${encodeURIComponent(articleCategory.slug)}`;
    return (
      <ArticleForm
        key={article.id}
        userEmail={userEmail}
        article={article}
        categories={categories}
        articlesIndexHref={articlesIndexHref}
        stayOnPageAfterSave
        enableAutosave
      />
    );
  }

  const article = await getPublishedArticleBySlugs(slug, articleSlug);
  if (!article) notFound();

  const sourceUrl = article.sourceUrl?.trim();
  const magazineColumn = isMagazineColumnArticle(articleSlug);
  const pairCarousel = isPairCarouselArticle(articleSlug);
  const splitCarousel = isSplitCarouselArticle(articleSlug);

  return (
    <ArticlePublicLayout
      categorySlug={slug}
      categoryTitle={rubrique.title}
      title={article.title}
      kicker={article.kicker ?? undefined}
      excerpt={article.excerpt}
      publishedAt={article.publishedAt}
      authorName={article.authorName ?? undefined}
      coverImageUrl={article.coverImageUrl}
      coverImageAlt={article.coverImageAlt}
      coverObjectPosition={article.coverObjectPosition}
      sourceUrl={sourceUrl}
      articleSurface={magazineColumn ? "magazine-column" : "default"}
    >
      <ArticleBody
        content={article.content as object}
        layoutVariant={magazineColumn ? "magazine-column" : "default"}
        pairCarousel={!magazineColumn && pairCarousel}
        splitCarousel={!magazineColumn && splitCarousel}
        splitCarouselSkipLeading={
          !magazineColumn && splitCarousel ? splitCarouselSkipLeadingSplits(articleSlug) : 0
        }
        splitCarouselExcludeHeadingInCopy={
          !magazineColumn && splitCarousel && splitCarouselExcludeHeadingSplits(articleSlug)
        }
      />
    </ArticlePublicLayout>
  );
}
