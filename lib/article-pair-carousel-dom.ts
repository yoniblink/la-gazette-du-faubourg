/**
 * Regroupe les `.article-tiptap-pair` consécutifs (y compris `article-tiptap-pair--stack`)
 * en carrousel horizontal : chaque image = une slide ; le viewport affiche **deux** images
 * d’affilée (preview côte à côte, défilement image par image).
 */

import { publicExternalNavButtonClass } from "@/components/icons/NavChevronIcon";

export type MountPairCarouselIcons = {
  prevSvg: string;
  nextSvg: string;
};

function collectPairRuns(container: HTMLElement): HTMLElement[][] {
  const runs: HTMLElement[][] = [];
  let current: HTMLElement[] = [];

  for (const node of Array.from(container.children)) {
    if (!(node instanceof HTMLElement)) continue;

    const isPair = node.classList.contains("article-tiptap-pair");

    if (isPair) {
      current.push(node);
      continue;
    }

    if (current.length >= 2) {
      runs.push(current);
    }
    current = [];
  }

  if (current.length >= 2) {
    runs.push(current);
  }

  return runs;
}

function slideScrollDelta(viewport: HTMLElement): number {
  const slide = viewport.querySelector(".article-tiptap-pair-carousel__slide");
  if (!(slide instanceof HTMLElement)) {
    return viewport.clientWidth;
  }
  const track = slide.parentElement;
  const gapRaw = track ? parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) : 0;
  const gap = Number.isFinite(gapRaw) ? gapRaw : 0;
  return slide.getBoundingClientRect().width + gap;
}

function wireCarousel(viewport: HTMLElement, prev: HTMLButtonElement, next: HTMLButtonElement): () => void {
  const sync = () => {
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth - 1);
    prev.disabled = viewport.scrollLeft <= 1;
    next.disabled = viewport.scrollLeft >= maxScroll;
  };

  const onScroll = () => sync();
  viewport.addEventListener("scroll", onScroll, { passive: true });

  const ro = new ResizeObserver(() => sync());
  ro.observe(viewport);

  const step = () => slideScrollDelta(viewport);
  const onPrev = () => {
    viewport.scrollBy({ left: -step(), behavior: "smooth" });
  };
  const onNext = () => {
    viewport.scrollBy({ left: step(), behavior: "smooth" });
  };
  prev.addEventListener("click", onPrev);
  next.addEventListener("click", onNext);

  sync();

  return () => {
    viewport.removeEventListener("scroll", onScroll);
    ro.disconnect();
    prev.removeEventListener("click", onPrev);
    next.removeEventListener("click", onNext);
  };
}

function buildCarouselShell(icons: MountPairCarouselIcons): {
  root: HTMLElement;
  track: HTMLElement;
  viewport: HTMLElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
} {
  const root = document.createElement("div");
  root.className = "article-tiptap-pair-carousel";
  root.setAttribute("role", "region");
  root.setAttribute("aria-roledescription", "carousel");
  root.setAttribute("aria-label", "Galerie d’images");

  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = `article-tiptap-pair-carousel__btn ${publicExternalNavButtonClass}`;
  prev.setAttribute("aria-label", "Voir les images précédentes");
  prev.innerHTML = icons.prevSvg;

  const next = document.createElement("button");
  next.type = "button";
  next.className = `article-tiptap-pair-carousel__btn ${publicExternalNavButtonClass}`;
  next.setAttribute("aria-label", "Voir les images suivantes");
  next.innerHTML = icons.nextSvg;

  const viewport = document.createElement("div");
  viewport.className = "article-tiptap-pair-carousel__viewport";

  const track = document.createElement("div");
  track.className = "article-tiptap-pair-carousel__track";

  viewport.appendChild(track);
  root.appendChild(prev);
  root.appendChild(viewport);
  root.appendChild(next);

  return { root, track, viewport, prev, next };
}

function flattenPairIntoSlides(track: HTMLElement, pair: HTMLElement): void {
  const cells = Array.from(pair.children).filter((n): n is HTMLElement => n instanceof HTMLElement);
  for (const cell of cells) {
    const slide = document.createElement("div");
    slide.className = "article-tiptap-pair-carousel__slide article-tiptap-pair-carousel__slide--flat";
    slide.appendChild(cell);
    track.appendChild(slide);
  }
  pair.remove();
}

function finalizeCarousel(
  track: HTMLElement,
  run: HTMLElement[],
  viewport: HTMLElement,
  prev: HTMLButtonElement,
  next: HTMLButtonElement,
): () => void {
  for (const pair of run) {
    flattenPairIntoSlides(track, pair);
  }
  return wireCarousel(viewport, prev, next);
}

/**
 * Transforme le contenu in-place. Retourne une fonction de nettoyage (noop si rien fait).
 */
export function mountArticlePairCarousels(container: HTMLElement, icons: MountPairCarouselIcons): () => void {
  const runs = collectPairRuns(container);
  if (runs.length === 0) {
    return () => {};
  }

  const cleanups: (() => void)[] = [];

  for (const run of runs) {
    const anchor = run[0];
    const parent = anchor.parentElement;
    if (!parent) continue;

    const shell = buildCarouselShell(icons);
    parent.insertBefore(shell.root, anchor);
    cleanups.push(finalizeCarousel(shell.track, run, shell.viewport, shell.prev, shell.next));
  }

  return () => {
    for (const c of cleanups) c();
  };
}
