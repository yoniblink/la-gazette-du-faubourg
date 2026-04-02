import { ArticleTiptapSurface } from "@/components/article/ArticleTiptapSurface";
import { buildArticleSurfaceHtml, type ArticleSurfaceHtmlLayoutVariant } from "@/lib/article-surface-html";

export type ArticleBodyLayoutVariant = ArticleSurfaceHtmlLayoutVariant;

export function ArticleBody({
  content,
  layoutVariant = "default",
  pairCarousel = false,
  splitCarousel = false,
  splitCarouselSkipLeading = 0,
  splitCarouselExcludeHeadingInCopy = false,
}: {
  content: object;
  layoutVariant?: ArticleBodyLayoutVariant;
  /** Carrousel horizontal pour les suites de paires d’images (opt-in par article). */
  pairCarousel?: boolean;
  /** Carrousel horizontal pour les suites de blocs image|texte (opt-in par article). */
  splitCarousel?: boolean;
  /** Nombre de blocs split laissés au-dessus du carrousel (intro). */
  splitCarouselSkipLeading?: number;
  /** Exclut les splits avec chapô h1–h3 du carrousel. */
  splitCarouselExcludeHeadingInCopy?: boolean;
}) {
  const html = buildArticleSurfaceHtml(content, { layoutVariant });

  return (
    <ArticleTiptapSurface
      html={html}
      layoutVariant={layoutVariant}
      pairCarousel={pairCarousel}
      splitCarousel={splitCarousel}
      splitCarouselSkipLeading={splitCarouselSkipLeading}
      splitCarouselExcludeHeadingInCopy={splitCarouselExcludeHeadingInCopy}
    />
  );
}
