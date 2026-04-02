import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * Reprend le span WordPress / Elementor pour les chiffres dans les titres (Griffiths en CSS public).
 */
export const FontNumberStyle = Mark.create({
  name: "fontNumberStyle",

  parseHTML() {
    return [
      { tag: 'span[class="font-number-style"]' },
      { tag: "span.font-number-style" },
      {
        tag: "span",
        getAttrs: (el) => {
          if (typeof el === "string" || !("getAttribute" in el)) return false;
          const c = (el as HTMLElement).getAttribute("class") ?? "";
          return /\bfont-number-style\b/.test(c) ? {} : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes({ class: "font-number-style" }, HTMLAttributes),
      0,
    ];
  },
});
