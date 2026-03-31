import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import { getTiptapExtensions } from "@/lib/tiptap/extensions";

export function ArticleBody({ content }: { content: object }) {
  const html = generateHTML(content as JSONContent, getTiptapExtensions());
  return (
    <div
      className="article-tiptap-html mt-14 space-y-6 border-t border-black/[0.08] pt-12"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
