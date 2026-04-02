import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getPublishedArticleBySlugs } from "@/lib/data/articles";
import { ArticleBody } from "@/components/ArticleBody";
import { ArticlePublicLayout } from "@/components/article/ArticlePublicLayout";
import { site } from "@/lib/content/site";
import { isMagazineColumnArticle } from "@/lib/article-layout-variants";

type Props = { params: Promise<{ slug: string; articleSlug: string }> };

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

export default async function RubriqueArticlePage({ params }: Props) {
  const { slug, articleSlug } = await params;
  const rubrique = await getCategoryBySlug(slug);
  const article = await getPublishedArticleBySlugs(slug, articleSlug);
  if (!rubrique || !article) notFound();

  const sourceUrl = article.sourceUrl?.trim();
  const magazineColumn = isMagazineColumnArticle(articleSlug);

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
      />
    </ArticlePublicLayout>
  );
}
