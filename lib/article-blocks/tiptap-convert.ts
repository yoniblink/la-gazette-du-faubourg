import type { JSONContent } from "@tiptap/core";
import { generateHTML, generateJSON } from "@tiptap/html";
import { getTiptapExtensions } from "@/lib/tiptap/extensions";
import { emptyTipTapDoc } from "@/lib/tiptap/empty-doc";
import type { ArticleBlock } from "./types";
import { blockId, emptyBlocks } from "./types";

const extensionsForConvert = () => getTiptapExtensions();

function stripOuterTag(html: string, tag: string): string {
  const re = new RegExp(`^<${tag}[^>]*>([\\s\\S]*)</${tag}>$`, "i");
  const m = html.trim().match(re);
  return m ? m[1] : html;
}

function paragraphInnerFromNode(node: JSONContent): string {
  const html = generateHTML({ type: "doc", content: [node] }, extensionsForConvert());
  return stripOuterTag(html, "p");
}

function blockquoteInnerFromNode(node: JSONContent): string {
  const html = generateHTML({ type: "doc", content: [node] }, extensionsForConvert());
  return stripOuterTag(html, "blockquote");
}

function extractPlainHeading(node: JSONContent): string {
  if (!node.content?.length) return "";
  const parts: string[] = [];
  for (const c of node.content) {
    if (c.type === "text" && c.text) parts.push(c.text);
  }
  return parts.join("");
}

function listItemsToText(list: JSONContent): string[] {
  const lines: string[] = [];
  if (!list.content?.length) return lines;
  let idx = 1;
  const ordered = list.type === "orderedList";
  for (const li of list.content) {
    if (li.type !== "listItem" || !li.content?.length) continue;
    const inner = li.content
      .map((n) => {
        if (n.type === "paragraph") return paragraphInnerFromNode(n);
        if (n.type === "bulletList" || n.type === "orderedList") {
          return listItemsToText(n).join("\n");
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
    const prefix = ordered ? `${idx}. ` : "• ";
    if (inner) lines.push(`${prefix}${inner}`);
    idx += 1;
  }
  return lines;
}

function normalizeHeadingLevel(level: number): 1 | 2 | 3 {
  if (level <= 1) return 1;
  if (level === 2) return 2;
  return 3;
}

export function tipTapToBlocks(doc: JSONContent | null | undefined): ArticleBlock[] {
  if (!doc || doc.type !== "doc" || !Array.isArray(doc.content)) {
    return emptyBlocks();
  }
  const out: ArticleBlock[] = [];
  for (const n of doc.content) {
    if (!n || typeof n !== "object") continue;
    switch (n.type) {
      case "heading":
        out.push({
          id: blockId(),
          type: "heading",
          level: normalizeHeadingLevel((n.attrs?.level as number) ?? 2),
          text: extractPlainHeading(n),
        });
        break;
      case "paragraph":
        out.push({
          id: blockId(),
          type: "paragraph",
          html: paragraphInnerFromNode(n),
        });
        break;
      case "blockquote":
        out.push({
          id: blockId(),
          type: "quote",
          html: blockquoteInnerFromNode(n),
        });
        break;
      case "horizontalRule":
        out.push({ id: blockId(), type: "divider" });
        break;
      case "image": {
        const attrs = (n.attrs ?? {}) as Record<string, unknown>;
        const alignRaw = attrs.align as string | undefined;
        const align =
          alignRaw === "left" || alignRaw === "right" || alignRaw === "center" ? alignRaw : "center";
        const wp = attrs.widthPercent;
        const widthPercent =
          typeof wp === "number" && Number.isFinite(wp) ? Math.min(100, Math.max(25, wp)) : 100;
        out.push({
          id: blockId(),
          type: "image",
          src: String(attrs.src ?? ""),
          alt: String(attrs.alt ?? ""),
          caption: String(attrs.caption ?? attrs.title ?? ""),
          align,
          widthPercent,
        });
        break;
      }
      case "articleGallery": {
        const images: { src: string; alt: string }[] = [];
        const pushFromAttrs = (row: unknown) => {
          if (!row || typeof row !== "object") return;
          const src = String((row as { src?: string }).src ?? "").trim();
          if (!src) return;
          images.push({ src, alt: String((row as { alt?: string }).alt ?? "").trim() });
        };
        if (Array.isArray(n.content)) {
          for (const c of n.content) {
            if (!c || typeof c !== "object" || (c as { type?: string }).type !== "image") continue;
            const attrs = ((c as { attrs?: Record<string, unknown> }).attrs ?? {}) as Record<
              string,
              unknown
            >;
            const src = String(attrs.src ?? "").trim();
            if (src) images.push({ src, alt: String(attrs.alt ?? "").trim() });
          }
        }
        const attrImgs = n.attrs?.images;
        if (images.length === 0 && Array.isArray(attrImgs)) {
          for (const row of attrImgs) pushFromAttrs(row);
        }
        if (images.length === 0) {
          out.push({ id: blockId(), type: "paragraph", html: "" });
        } else {
          out.push({ id: blockId(), type: "gallery", images });
        }
        break;
      }
      case "bulletList":
      case "orderedList": {
        const lines = listItemsToText(n);
        if (lines.length === 0) {
          out.push({ id: blockId(), type: "paragraph", html: "" });
        } else {
          for (const line of lines) {
            out.push({ id: blockId(), type: "paragraph", html: line });
          }
        }
        break;
      }
      default:
        break;
    }
  }
  return out.length ? out : emptyBlocks();
}

function paragraphNodeFromHtml(html: string): JSONContent {
  const trimmed = html.trim();
  if (!trimmed) return { type: "paragraph" };
  try {
    const json = generateJSON(`<p>${trimmed}</p>`, extensionsForConvert());
    const first = json.content?.[0];
    if (first?.type === "paragraph") return first;
  } catch {
    // ignore
  }
  return { type: "paragraph", content: [{ type: "text", text: html.replace(/<[^>]+>/g, "") }] };
}

function quoteNodeFromHtml(html: string): JSONContent {
  const trimmed = html.trim();
  if (!trimmed) {
    return {
      type: "blockquote",
      content: [{ type: "paragraph" }],
    };
  }
  try {
    const json = generateJSON(`<blockquote><p>${trimmed}</p></blockquote>`, extensionsForConvert());
    const first = json.content?.[0];
    if (first?.type === "blockquote") return first;
  } catch {
    // ignore
  }
  return {
    type: "blockquote",
    content: [paragraphNodeFromHtml(trimmed)],
  };
}

export function blocksToTipTap(blocks: ArticleBlock[]): JSONContent {
  const content: JSONContent[] = [];

  for (const b of blocks) {
    switch (b.type) {
      case "heading":
        content.push({
          type: "heading",
          attrs: { level: b.level },
          content: b.text.trim()
            ? [{ type: "text", text: b.text.trim() }]
            : [],
        });
        break;
      case "paragraph":
        content.push(paragraphNodeFromHtml(b.html));
        break;
      case "quote":
        content.push(quoteNodeFromHtml(b.html));
        break;
      case "divider":
        content.push({ type: "horizontalRule" });
        break;
      case "image":
        if (b.src.trim()) {
          content.push({
            type: "image",
            attrs: {
              src: b.src.trim(),
              alt: b.alt.trim(),
              align: b.align,
              widthPercent: b.widthPercent,
              caption: b.caption.trim(),
            },
          });
        }
        break;
      case "gallery":
        for (const im of b.images) {
          if (im.src.trim()) {
            content.push({
              type: "image",
              attrs: {
                src: im.src.trim(),
                alt: im.alt.trim(),
                align: "center",
                widthPercent: 100,
                caption: "",
              },
            });
          }
        }
        break;
    }
  }

  if (!content.length) {
    return { ...(emptyTipTapDoc as object) } as JSONContent;
  }
  return { type: "doc", content };
}

export function tiptapDocFromBlocks(blocks: ArticleBlock[]): JSONContent {
  return blocksToTipTap(blocks);
}

export function blockToHtml(block: ArticleBlock): string {
  const doc = blocksToTipTap([block]);
  return generateHTML(doc, extensionsForConvert());
}
