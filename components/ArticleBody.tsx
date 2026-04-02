import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import { applyElementorArticleLayout } from "@/lib/article-html-elementor-layout";
import { getTiptapExtensions } from "@/lib/tiptap/extensions";
import { resolveWpMediaInArticleHtml } from "@/lib/wp-article-media-urls";

export function ArticleBody({ content }: { content: object }) {
  const raw = resolveWpMediaInArticleHtml(
    generateHTML(content as JSONContent, getTiptapExtensions()),
  );
  const html = applyElementorArticleLayout(raw);
  return (
    <div
      className="article-tiptap-html article-tiptap-elementor-structure mt-12"
      data-article-layout="elementor-post"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
