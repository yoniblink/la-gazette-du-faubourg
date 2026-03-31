import Image from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";

export type ArticleImageAlign = "left" | "center" | "right";

export const ArticleImage = Image.extend({
  name: "image",

  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center" as ArticleImageAlign,
        parseHTML: (el) => {
          const v = el.getAttribute("data-align");
          if (v === "left" || v === "right" || v === "center") return v;
          return "center";
        },
        renderHTML: (attrs) => {
          const a = attrs.align as ArticleImageAlign | undefined;
          return a && a !== "center" ? { "data-align": a } : {};
        },
      },
      widthPercent: {
        default: 100,
        parseHTML: (el) => {
          const w = parseInt(el.getAttribute("data-width") ?? "100", 10);
          return Number.isFinite(w) ? Math.min(100, Math.max(25, w)) : 100;
        },
        renderHTML: (attrs) => {
          const w = attrs.widthPercent as number | undefined;
          if (w != null && w !== 100) return { "data-width": String(w) };
          return {};
        },
      },
      caption: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-caption") ?? "",
        renderHTML: (attrs) => {
          const c = attrs.caption as string | undefined;
          if (c?.trim()) return { "data-caption": c.trim() };
          return {};
        },
      },
    };
  },

  renderHTML({ HTMLAttributes, node }) {
    const align = (node.attrs.align as ArticleImageAlign) ?? "center";
    const w = (node.attrs.widthPercent as number) ?? 100;
    const caption = String(node.attrs.caption ?? "").trim();
    const width = Math.min(100, Math.max(25, w));
    const margin =
      align === "left"
        ? "1.25rem auto 1.25rem 0"
        : align === "right"
          ? "1.25rem 0 1.25rem auto"
          : "1.25rem auto";
    const style = `max-width:${width}%;width:100%;height:auto;display:block;margin:${margin};border-radius:4px;`;

    const img = [
      "img",
      mergeAttributes(HTMLAttributes, {
        style,
        "data-align": align,
        "data-width": String(width),
        ...(caption ? { "data-caption": caption } : {}),
      }),
    ] as const;

    if (caption) {
      return [
        "figure",
        { class: "article-tiptap-figure" },
        img,
        ["figcaption", { class: "article-tiptap-figcaption" }, caption],
      ] as const;
    }

    return img;
  },
});
