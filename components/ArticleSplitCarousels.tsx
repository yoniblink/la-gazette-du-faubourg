"use client";

import { useEffect } from "react";

/**
 * Hydrate les carrousels générés par applyElementorArticleLayout (HTML brut dans ArticleBody).
 */
export function ArticleSplitCarousels() {
  useEffect(() => {
    const roots = document.querySelectorAll<HTMLElement>(".article-tiptap-split-carousel");
    const disposers: (() => void)[] = [];

    roots.forEach((root) => {
      const viewport = root.querySelector<HTMLElement>(".article-tiptap-split-carousel__viewport");
      const track = root.querySelector<HTMLElement>(".article-tiptap-split-carousel__track");
      const prev = root.querySelector<HTMLButtonElement>(
        ".article-tiptap-split-carousel__btn--prev",
      );
      const next = root.querySelector<HTMLButtonElement>(
        ".article-tiptap-split-carousel__btn--next",
      );
      if (!viewport || !track || !prev || !next) return;

      const slideSel = ".article-tiptap-split--carousel-slide";

      const syncSlideWidths = (done?: () => void) => {
        viewport.style.removeProperty("width");
        viewport.style.removeProperty("max-width");
        viewport.style.removeProperty("margin-inline");

        const vcs = getComputedStyle(viewport);
        const padL = parseFloat(vcs.paddingLeft) || 0;
        const padR = parseFloat(vcs.paddingRight) || 0;
        const inner = Math.max(0, viewport.clientWidth - padL - padR);

        const gapCss = parseFloat(getComputedStyle(track).gap || "0") || 0;

        const cols = inner <= 360 ? 1 : inner <= 520 ? 2 : 3;
        root.classList.toggle("article-tiptap-split-carousel--one-col", cols === 1);

        const applyWidths = (gapPx: number) => {
          let slideW: number;
          if (cols === 1) {
            slideW = inner * 0.88;
          } else if (cols === 2) {
            slideW = (inner - gapPx) / 2;
            slideW += (inner - 2 * slideW - gapPx) / 2;
          } else {
            slideW = (inner - 2 * gapPx) / 3;
            slideW += (inner - 3 * slideW - 2 * gapPx) / 3;
          }
          root.style.setProperty("--carousel-slide-w", `${Number(slideW.toFixed(3))}px`);
        };

        applyWidths(gapCss);

        requestAnimationFrame(() => {
          const slides = track.querySelectorAll<HTMLElement>(slideSel);
          let gapUsed = gapCss;
          if (slides.length >= 2) {
            const gm =
              slides[1].getBoundingClientRect().left - slides[0].getBoundingClientRect().right;
            if (gm > 0) gapUsed = gm;
          }
          if (cols !== 1) {
            applyWidths(gapUsed);
          }

          requestAnimationFrame(() => {
            const s = track.querySelectorAll<HTMLElement>(slideSel);
            const pads = getComputedStyle(viewport);
            const pL = parseFloat(pads.paddingLeft) || 0;
            const pR = parseFloat(pads.paddingRight) || 0;

            let innerClip = 0;
            if (cols === 3 && s.length >= 3) {
              const r0 = s[0].getBoundingClientRect();
              const r2 = s[2].getBoundingClientRect();
              innerClip = r2.right - r0.left;
            } else if (cols === 3 && s[0]) {
              const sw = s[0].offsetWidth;
              let g = gapUsed;
              if (s.length >= 2) {
                const gm =
                  s[1].getBoundingClientRect().left - s[0].getBoundingClientRect().right;
                if (gm > 0) g = gm;
              }
              innerClip = 3 * sw + 2 * g;
            } else if (cols === 2 && s.length >= 2) {
              const r0 = s[0].getBoundingClientRect();
              const r1 = s[1].getBoundingClientRect();
              innerClip = r1.right - r0.left;
            } else if (cols === 2 && s[0]) {
              const sw = s[0].offsetWidth;
              let g = gapUsed;
              if (s.length >= 2) {
                const gm =
                  s[1].getBoundingClientRect().left - s[0].getBoundingClientRect().right;
                if (gm > 0) g = gm;
              }
              innerClip = 2 * sw + g;
            } else if (s[0]) {
              innerClip = s[0].getBoundingClientRect().width;
            }

            /* Largeur bordure à bord = zone des N cartes + padding ; floor sur la zone utile pour ne jamais montrer la (N+1)e. */
            if (innerClip > 0) {
              const borderBox = Math.max(1, Math.floor(innerClip) + pL + pR);
              viewport.style.width = `${borderBox}px`;
              viewport.style.maxWidth = `${borderBox}px`;
              viewport.style.marginInline = "auto";
            }
            done?.();
          });
        });
      };

      const getStep = () => {
        const first = track.querySelector<HTMLElement>(slideSel);
        if (!first) return viewport.clientWidth;
        const cs = getComputedStyle(track);
        const gap = parseFloat(cs.columnGap || cs.gap || "0") || 0;
        return first.offsetWidth + gap;
      };

      const onPrev = () => {
        viewport.scrollBy({ left: -getStep(), behavior: "smooth" });
      };
      const onNext = () => {
        viewport.scrollBy({ left: getStep(), behavior: "smooth" });
      };

      const updateDisabled = () => {
        const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        const eps = 2;
        prev.disabled = viewport.scrollLeft <= eps;
        next.disabled = viewport.scrollLeft >= maxScroll - eps;
      };

      const layout = () => {
        syncSlideWidths(updateDisabled);
      };

      prev.addEventListener("click", onPrev);
      next.addEventListener("click", onNext);
      viewport.addEventListener("scroll", updateDisabled, { passive: true });
      const ro = new ResizeObserver(layout);
      ro.observe(root);
      ro.observe(viewport);
      ro.observe(track);
      layout();
      requestAnimationFrame(layout);

      disposers.push(() => {
        prev.removeEventListener("click", onPrev);
        next.removeEventListener("click", onNext);
        viewport.removeEventListener("scroll", updateDisabled);
        ro.disconnect();
        root.style.removeProperty("--carousel-slide-w");
        root.classList.remove("article-tiptap-split-carousel--one-col");
        viewport.style.removeProperty("width");
        viewport.style.removeProperty("max-width");
        viewport.style.removeProperty("margin-inline");
      });
    });

    return () => disposers.forEach((d) => d());
  }, []);

  return null;
}
