"use client";

import { useLayoutEffect, useRef } from "react";
import { mountArticlePairCarousels } from "@/lib/article-pair-carousel-dom";

type ArticleLayoutVariant = "default" | "magazine-column";

const PREV_SVG = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M15.5 5.5L8 12L15.5 18.5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const NEXT_SVG = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M8.5 5.5L16 12L8.5 18.5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

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
    return mountArticlePairCarousels(el, { prevSvg: PREV_SVG, nextSvg: NEXT_SVG });
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
