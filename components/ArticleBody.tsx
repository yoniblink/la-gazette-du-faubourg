import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import { applyMagazineColumnEnhancements } from "@/lib/article-html-magazine-column";
import { applyElementorArticleLayout } from "@/lib/article-html-elementor-layout";
import { getTiptapExtensions } from "@/lib/tiptap/extensions";
import { resolveWpMediaInArticleHtml } from "@/lib/wp-article-media-urls";

export type ArticleBodyLayoutVariant = "default" | "magazine-column";

export function ArticleBody({
  content,
  layoutVariant = "default",
}: {
  content: object;
  layoutVariant?: ArticleBodyLayoutVariant;
}) {
  const raw = resolveWpMediaInArticleHtml(
    generateHTML(content as JSONContent, getTiptapExtensions()),
  );
  const html =
    layoutVariant === "magazine-column"
      ? applyMagazineColumnEnhancements(raw)
      : applyElementorArticleLayout(raw);

  const isMagazine = layoutVariant === "magazine-column";

  return (
    <div
      className={
        isMagazine
          ? "article-tiptap-html article-tiptap-magazine-column mt-10 md:mt-12"
          : "article-tiptap-html article-tiptap-elementor-structure mt-12"
      }
      data-article-layout={isMagazine ? "magazine-column" : "elementor-post"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
