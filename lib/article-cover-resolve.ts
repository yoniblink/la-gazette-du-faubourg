/**
 * Couverture affichée : URL en base, sinon première image du corps TipTap,
 * sinon visuel de la rubrique (même logique que l’import WordPress).
 */
export function firstImageFromTipTapDoc(doc: unknown): { src: string; alt: string } | null {
  const walk = (n: unknown): { src: string; alt: string } | null => {
    if (!n || typeof n !== "object") return null;
    const o = n as {
      type?: string;
      attrs?: { src?: string; alt?: string };
      content?: unknown[];
    };
    if (o.type === "image" && typeof o.attrs?.src === "string") {
      const src = o.attrs.src.trim();
      if (!src) return null;
      const alt = typeof o.attrs.alt === "string" ? o.attrs.alt.trim() : "";
      return { src, alt };
    }
    if (Array.isArray(o.content)) {
      for (const c of o.content) {
        const hit = walk(c);
        if (hit) return hit;
      }
    }
    return null;
  };
  return walk(doc);
}

export function resolveArticleCoverFields(
  article: {
    coverImageUrl: string;
    coverImageAlt: string;
    title: string;
    content: unknown;
  },
  categoryFallback: { imageSrc: string; imageAlt: string },
): { coverImageUrl: string; coverImageAlt: string } {
  const cover = article.coverImageUrl.trim();
  if (cover) {
    return {
      coverImageUrl: cover,
      coverImageAlt: article.coverImageAlt.trim() || article.title,
    };
  }
  const fromBody = firstImageFromTipTapDoc(article.content);
  if (fromBody) {
    return {
      coverImageUrl: fromBody.src,
      coverImageAlt: fromBody.alt || article.title,
    };
  }
  const catSrc = categoryFallback.imageSrc.trim();
  if (catSrc) {
    return {
      coverImageUrl: catSrc,
      coverImageAlt: categoryFallback.imageAlt.trim() || article.title,
    };
  }
  return { coverImageUrl: "", coverImageAlt: article.coverImageAlt.trim() || article.title };
}
