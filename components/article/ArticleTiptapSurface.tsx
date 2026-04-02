"use client";

import { useLayoutEffect, useRef } from "react";
import { pairCarouselNavSvg } from "@/components/icons/NavChevronIcon";
import { mountArticlePairCarousels } from "@/lib/article-pair-carousel-dom";

type ArticleLayoutVariant = "default" | "magazine-column";

type Props = {
  html: string;
  layoutVariant: ArticleLayoutVariant;
  pairCarousel?: boolean;
};

export function ArticleTiptapSurface({ html, layoutVariant, pairCarousel = false }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el || !pairCarousel || layoutVariant !== "default") return;
    return mountArticlePairCarousels(el, {
      prevSvg: pairCarouselNavSvg.prev,
      nextSvg: pairCarouselNavSvg.next,
    });
  }, [html, pairCarousel, layoutVariant]);

  const isMagazine = layoutVariant === "magazine-column";

  return (
    <div
      ref={rootRef}
      className={
        isMagazine
          ? "article-tiptap-html article-tiptap-magazine-column mt-10 md:mt-12"
          : "article-tiptap-html article-tiptap-elementor-structure mt-12"
      }
      data-article-layout={isMagazine ? "magazine-column" : "elementor-post"}
      data-pair-carousel={pairCarousel && layoutVariant === "default" ? "true" : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
