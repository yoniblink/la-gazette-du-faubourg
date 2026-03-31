export type ArticleBlock =
  | ArticleBlockHeading
  | ArticleBlockParagraph
  | ArticleBlockImage
  | ArticleBlockQuote
  | ArticleBlockDivider
  | ArticleBlockGallery;

export type ArticleBlockHeading = {
  id: string;
  type: "heading";
  level: 1 | 2 | 3;
  text: string;
};

export type ArticleBlockParagraph = {
  id: string;
  type: "paragraph";
  /** Subset HTML (inline tags from TipTap: strong, em, a, br) */
  html: string;
};

export type ArticleBlockImage = {
  id: string;
  type: "image";
  src: string;
  alt: string;
  caption: string;
  align: "left" | "center" | "right";
  widthPercent: number;
};

export type ArticleBlockQuote = {
  id: string;
  type: "quote";
  html: string;
};

export type ArticleBlockDivider = {
  id: string;
  type: "divider";
};

export type ArticleBlockGallery = {
  id: string;
  type: "gallery";
  images: { src: string; alt: string }[];
};

export function blockId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyBlocks(): ArticleBlock[] {
  return [{ id: blockId(), type: "paragraph", html: "" }];
}

export function createBlock(kind: ArticleBlock["type"]): ArticleBlock {
  const id = blockId();
  switch (kind) {
    case "heading":
      return { id, type: "heading", level: 2, text: "" };
    case "paragraph":
      return { id, type: "paragraph", html: "" };
    case "image":
      return {
        id,
        type: "image",
        src: "",
        alt: "",
        caption: "",
        align: "center",
        widthPercent: 100,
      };
    case "quote":
      return { id, type: "quote", html: "" };
    case "divider":
      return { id, type: "divider" };
    case "gallery":
      return { id, type: "gallery", images: [] };
    default: {
      const _x: never = kind;
      return _x;
    }
  }
}
