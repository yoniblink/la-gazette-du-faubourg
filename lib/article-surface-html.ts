import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import { applyMagazineColumnEnhancements } from "@/lib/article-html-magazine-column";
import { applyElementorArticleLayout } from "@/lib/article-html-elementor-layout";
import { getTiptapExtensions } from "@/lib/tiptap/extensions";
import { resolveWpMediaInArticleHtml } from "@/lib/wp-article-media-urls";

export type ArticleSurfaceHtmlLayoutVariant = "default" | "magazine-column";

/**
 * Pipeline identique au rendu public (`ArticleBody`) : TipTap JSON → HTML enrichi.
 * Partagé serveur et client pour un aperçu admin 1:1.
 */
export function buildArticleSurfaceHtml(
  content: object,
  options: { layoutVariant?: ArticleSurfaceHtmlLayoutVariant } = {},
): string {
  const layoutVariant = options.layoutVariant ?? "default";
  const raw = resolveWpMediaInArticleHtml(
    generateHTML(content as JSONContent, getTiptapExtensions()),
  );
  return layoutVariant === "magazine-column"
    ? applyMagazineColumnEnhancements(raw)
    : applyElementorArticleLayout(raw);
}
