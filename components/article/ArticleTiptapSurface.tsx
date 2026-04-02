"use client";

import { useLayoutEffect, useRef } from "react";
import { pairCarouselNavSvg } from "@/components/icons/NavChevronIcon";
import { mountArticlePairCarousels } from "@/lib/article-pair-carousel-dom";
import { mountArticleSplitCarousels } from "@/lib/article-split-carousel-dom";

type ArticleLayoutVariant = "default" | "magazine-column";

type Props = {
  html: string;
  layoutVariant: ArticleLayoutVariant;
  pairCarousel?: boolean;
  splitCarousel?: boolean;
  splitCarouselSkipLeading?: number;
  /** Exclut les splits avec titre h1–h3 dans le texte (chapô hors bandeau). */
  splitCarouselExcludeHeadingInCopy?: boolean;
};

export function ArticleTiptapSurface({
  html,
  layoutVariant,
  pairCarousel = false,
  splitCarousel = false,
  splitCarouselSkipLeading = 0,
  splitCarouselExcludeHeadingInCopy = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el || layoutVariant !== "default") return;
    const icons = {
      prevSvg: pairCarouselNavSvg.prev,
      nextSvg: pairCarouselNavSvg.next,
    };
    const cleanups: (() => void)[] = [];
    if (splitCarousel) {
      cleanups.push(
        mountArticleSplitCarousels(el, icons, {
          skipLeadingSplits: splitCarouselSkipLeading,
          excludeSplitsWithHeadingInCopy: splitCarouselExcludeHeadingInCopy,
        }),
      );
    }
    if (pairCarousel) cleanups.push(mountArticlePairCarousels(el, icons));
    if (cleanups.length === 0) return;
    return () => {
      for (const c of cleanups) c();
    };
  }, [
    html,
    pairCarousel,
    splitCarousel,
    splitCarouselSkipLeading,
    splitCarouselExcludeHeadingInCopy,
    layoutVariant,
  ]);

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
      data-split-carousel={splitCarousel && layoutVariant === "default" ? "true" : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
