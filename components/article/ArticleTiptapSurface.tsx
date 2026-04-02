"use client";

import { useLayoutEffect, useRef } from "react";
import { generateJSON } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import { pairCarouselNavSvg } from "@/components/icons/NavChevronIcon";
import { mountArticlePairCarousels } from "@/lib/article-pair-carousel-dom";
import { mountArticleSplitCarousels } from "@/lib/article-split-carousel-dom";
import { getTiptapExtensions } from "@/lib/tiptap/extensions";

type ArticleLayoutVariant = "default" | "magazine-column";

type Props = {
  html: string;
  layoutVariant: ArticleLayoutVariant;
  pairCarousel?: boolean;
  splitCarousel?: boolean;
  splitCarouselSkipLeading?: number;
  /** Exclut les splits avec titre h1–h3 dans le texte (chapô hors bandeau). */
  splitCarouselExcludeHeadingInCopy?: boolean;
  /**
   * Édition inline : paragraphes / titres / citations en contentEditable, images cliquables pour changer l’URL.
   * Le HTML provient du pipeline public (Elementor / magazine) : la synchro vers TipTap JSON peut échouer sur des mises en page très complexes.
   */
  editMode?: boolean;
  /** Appelé après modification du DOM (debounce ou blur) avec le document TipTap dérivé du HTML courant. */
  onLiveTipTapDocChange?: (doc: JSONContent) => void;
};

const EDITABLE_SELECTOR = "p, h1, h2, h3, h4, h5, h6, blockquote, li";

function commitDomToTipTap(
  container: HTMLElement,
  onLiveTipTapDocChange: (doc: JSONContent) => void,
) {
  const inner = container.innerHTML.trim();
  if (!inner) return;
  let doc: JSONContent | null = null;
  try {
    doc = generateJSON(inner, getTiptapExtensions());
  } catch {
    try {
      doc = generateJSON(`<div>${inner}</div>`, getTiptapExtensions());
    } catch {
      return;
    }
  }
  onLiveTipTapDocChange(doc);
}

export function ArticleTiptapSurface({
  html,
  layoutVariant,
  pairCarousel = false,
  splitCarousel = false,
  splitCarouselSkipLeading = 0,
  splitCarouselExcludeHeadingInCopy = false,
  editMode = false,
  onLiveTipTapDocChange,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    if (editMode) {
      /** Carrousels : scripts qui mutent le DOM — désactivés en édition inline. */
      return;
    }

    const cleanups: (() => void)[] = [];
    if (layoutVariant === "default") {
      const icons = {
        prevSvg: pairCarouselNavSvg.prev,
        nextSvg: pairCarouselNavSvg.next,
      };
      if (splitCarousel) {
        cleanups.push(
          mountArticleSplitCarousels(el, icons, {
            skipLeadingSplits: splitCarouselSkipLeading,
            excludeSplitsWithHeadingInCopy: splitCarouselExcludeHeadingInCopy,
          }),
        );
      }
      if (pairCarousel) cleanups.push(mountArticlePairCarousels(el, icons));
    }

    const first = el.querySelector("img");
    if (first) {
      first.setAttribute("data-no-zoom", "true");
      first.removeAttribute("data-zoomable");
    }

    if (cleanups.length === 0) return;
    return () => {
      for (const c of cleanups) c();
    };
  }, [
    html,
    layoutVariant,
    pairCarousel,
    splitCarousel,
    splitCarouselSkipLeading,
    splitCarouselExcludeHeadingInCopy,
    editMode,
  ]);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!editMode || !onLiveTipTapDocChange || !el) return;

    const onDoc = onLiveTipTapDocChange;
    const surface = el;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const disposers: (() => void)[] = [];

    function scheduleCommit() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => commitDomToTipTap(surface, onDoc), 550);
    }

    surface.querySelectorAll(EDITABLE_SELECTOR).forEach((node) => {
      const h = node as HTMLElement;
      h.contentEditable = "true";
      h.setAttribute("spellcheck", "true");
      const onInput = () => scheduleCommit();
      const onBlur = () => commitDomToTipTap(surface, onDoc);
      h.addEventListener("input", onInput);
      h.addEventListener("blur", onBlur);
      disposers.push(() => {
        h.contentEditable = "false";
        h.removeAttribute("spellcheck");
        h.removeEventListener("input", onInput);
        h.removeEventListener("blur", onBlur);
      });
    });

    surface.querySelectorAll("img").forEach((img) => {
      const onClick = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        const next = window.prompt("URL de l’image (remplacement)", img.getAttribute("src") ?? "");
        if (next != null && next.trim()) {
          img.setAttribute("src", next.trim());
          commitDomToTipTap(surface, onDoc);
        }
      };
      img.addEventListener("click", onClick);
      img.style.cursor = "pointer";
      disposers.push(() => {
        img.removeEventListener("click", onClick);
        img.style.cursor = "";
      });
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      for (const d of disposers) d();
    };
  }, [html, editMode, onLiveTipTapDocChange]);

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
      data-pair-carousel={!editMode && pairCarousel && layoutVariant === "default" ? "true" : undefined}
      data-split-carousel={!editMode && splitCarousel && layoutVariant === "default" ? "true" : undefined}
      data-article-edit-mode={editMode ? "true" : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
