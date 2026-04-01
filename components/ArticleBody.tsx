import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import { getTiptapExtensions } from "@/lib/tiptap/extensions";
import { resolveWpMediaInArticleHtml } from "@/lib/wp-article-media-urls";

export function ArticleBody({ content }: { content: object }) {
  const html = resolveWpMediaInArticleHtml(
    generateHTML(content as JSONContent, getTiptapExtensions()),
  );
  return (
    <div
      className="article-tiptap-html mt-12 space-y-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
