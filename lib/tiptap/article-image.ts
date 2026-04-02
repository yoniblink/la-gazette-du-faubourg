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
    /* Même échelle que les blocs Elementor (row-gap / kit ≈ 30px entre image et titre). */
    const margin =
      align === "left"
        ? "30px auto 30px 0"
        : align === "right"
          ? "30px 0 30px auto"
          : "30px auto";
    const wrapStyle = `overflow:hidden;border-radius:4px;max-width:${width}%;width:100%;margin:${margin}`;
    const imgStyle = `max-width:100%;width:100%;height:auto;display:block;margin:0`;

    const img = [
      "img",
      mergeAttributes(HTMLAttributes, {
        style: imgStyle,
        "data-align": align,
        "data-width": String(width),
        ...(caption ? { "data-caption": caption } : {}),
      }),
    ] as const;

    const zoomWrap = ["div", { class: "article-tiptap-img-zoom-wrap", style: wrapStyle }, img] as const;

    if (caption) {
      return [
        "figure",
        { class: "article-tiptap-figure" },
        zoomWrap,
        ["figcaption", { class: "article-tiptap-figcaption" }, caption],
      ] as const;
    }

    return zoomWrap;
  },
});
