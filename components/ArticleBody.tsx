import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import { ArticleTiptapSurface } from "@/components/article/ArticleTiptapSurface";
import { applyMagazineColumnEnhancements } from "@/lib/article-html-magazine-column";
import { applyElementorArticleLayout } from "@/lib/article-html-elementor-layout";
import { getTiptapExtensions } from "@/lib/tiptap/extensions";
import { resolveWpMediaInArticleHtml } from "@/lib/wp-article-media-urls";

export type ArticleBodyLayoutVariant = "default" | "magazine-column";

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
  const raw = resolveWpMediaInArticleHtml(
    generateHTML(content as JSONContent, getTiptapExtensions()),
  );
  const html =
    layoutVariant === "magazine-column"
      ? applyMagazineColumnEnhancements(raw)
      : applyElementorArticleLayout(raw);

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
