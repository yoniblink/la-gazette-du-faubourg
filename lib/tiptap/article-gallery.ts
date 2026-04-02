import { Node, mergeAttributes } from "@tiptap/core";

type GalleryImage = { src?: string; alt?: string };

export const ArticleGallery = Node.create({
  name: "articleGallery",

  group: "block",

  content: "image*",

  addAttributes() {
    return {
      images: {
        default: null as unknown as GalleryImage[] | null,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-images");
          if (!raw) return null;
          try {
            const parsed = JSON.parse(raw) as unknown;
            return Array.isArray(parsed) ? (parsed as GalleryImage[]) : null;
          } catch {
            return null;
          }
        },
        renderHTML: (attributes) => {
          const imgs = attributes.images as GalleryImage[] | null;
          if (!imgs?.length) return {};
          return { "data-images": JSON.stringify(imgs) };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "div.article-tiptap-gallery" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const baseAttrs = mergeAttributes(HTMLAttributes, {
      class: "article-tiptap-gallery my-[30px] grid gap-4 sm:grid-cols-2",
    });

    if (node.content.childCount > 0) {
      return ["div", baseAttrs, 0] as const;
    }

    const imgs =
      (node.attrs.images as GalleryImage[] | null)?.filter((i) => String(i?.src ?? "").trim()) ?? [];

    if (imgs.length === 0) {
      return ["div", baseAttrs] as const;
    }

    return [
      "div",
      mergeAttributes(baseAttrs, { "data-images": JSON.stringify(node.attrs.images) }),
      ...imgs.map((im) => [
        "figure",
        { class: "article-tiptap-figure m-0" },
        [
          "div",
          { class: "article-tiptap-img-zoom-wrap" },
          [
            "img",
            {
              src: String(im.src).trim(),
              alt: String(im.alt ?? "").trim(),
              class: "h-auto w-full max-w-full object-contain",
              loading: "lazy",
              decoding: "async",
            },
          ],
        ],
      ]),
    ] as const;
  },
});
