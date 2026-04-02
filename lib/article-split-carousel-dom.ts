/**
 * Regroupe les `.article-tiptap-split` consécutifs (2+) en carrousel horizontal
 * (styles : app/globals.css `.article-tiptap-split-carousel*`).
 */

export type MountSplitCarouselIcons = {
  prevSvg: string;
  nextSvg: string;
};

export type MountSplitCarouselOptions = {
  /** Blocs split initiaux exclus du carrousel (intro au-dessus). */
  skipLeadingSplits?: number;
  /** Splits avec h1–h3 dans la colonne texte exclus du carrousel (chapô au-dessus de la galerie). */
  excludeSplitsWithHeadingInCopy?: boolean;
};

function svgWithIconClass(svgHtml: string): string {
  if (svgHtml.includes('class="')) {
    return svgHtml.replace(/class="/, 'class="article-tiptap-split-carousel__icon ');
  }
  return svgHtml.replace("<svg", '<svg class="article-tiptap-split-carousel__icon"');
}

function isRemovableGapBetweenSplits(el: HTMLElement): boolean {
  const t = el.tagName.toLowerCase();
  if (t === "p") {
    const text = (el.textContent ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    return text.length === 0 && el.children.length === 0;
  }
  if (t === "div") {
    if (
      el.classList.contains("article-tiptap-lead-media") ||
      el.classList.contains("article-tiptap-pair") ||
      el.classList.contains("article-tiptap-split-carousel")
    ) {
      return false;
    }
    if (el.children.length > 0) return false;
    return (el.textContent ?? "").trim().length === 0;
  }
  return false;
}

function stripEmptyGapsBetweenDirectSiblingSplits(container: HTMLElement): void {
  let changed = true;
  while (changed) {
    changed = false;
    const kids = Array.from(container.children);
    for (let i = 1; i < kids.length - 1; i++) {
      const before = kids[i - 1];
      const mid = kids[i];
      const after = kids[i + 1];
      if (
        before instanceof HTMLElement &&
        mid instanceof HTMLElement &&
        after instanceof HTMLElement &&
        before.classList.contains("article-tiptap-split") &&
        after.classList.contains("article-tiptap-split") &&
        isRemovableGapBetweenSplits(mid)
      ) {
        mid.remove();
        changed = true;
        break;
      }
    }
  }
}

/** Chapô type Elementor : titre de bloc dans la colonne texte (pas seulement légende en p). */
function splitCopyHasBlockHeading(split: HTMLElement): boolean {
  const copy = split.querySelector(":scope > .article-tiptap-split__copy");
  if (!(copy instanceof HTMLElement)) return false;
  return copy.querySelector(":scope > :is(h1, h2, h3)") !== null;
}

function collectSplitRuns(
  container: HTMLElement,
  skipLeadingSplits: number,
  excludeHeadingSplits: boolean,
): HTMLElement[][] {
  const runs: HTMLElement[][] = [];
  let current: HTMLElement[] = [];
  let splitOrdinal = 0;
  const skip = Math.max(0, skipLeadingSplits);
  /** Si on casse le run sur un split « éditorial », une seule montre restante est reportée sur la suite. */
  let pendingCarry: HTMLElement | null = null;

  for (const node of Array.from(container.children)) {
    if (!(node instanceof HTMLElement)) continue;

    const isSplit = node.classList.contains("article-tiptap-split");

    if (isSplit) {
      if (splitOrdinal < skip) {
        if (current.length >= 2) {
          runs.push(current);
        }
        current = [];
        pendingCarry = null;
        splitOrdinal++;
        continue;
      }
      if (excludeHeadingSplits && splitCopyHasBlockHeading(node)) {
        if (current.length >= 2) {
          runs.push(current);
        } else if (current.length === 1) {
          pendingCarry = current[0];
        }
        current = [];
        splitOrdinal++;
        continue;
      }
      if (pendingCarry !== null) {
        current.push(pendingCarry);
        pendingCarry = null;
      }
      current.push(node);
      splitOrdinal++;
      continue;
    }

    if (current.length >= 2) {
      runs.push(current);
    }
    current = [];
    pendingCarry = null;
  }

  if (current.length >= 2) {
    runs.push(current);
  }

  return runs;
}

function slideScrollDelta(viewport: HTMLElement): number {
  const slide = viewport.querySelector(".article-tiptap-split--carousel-slide");
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

function buildShell(icons: MountSplitCarouselIcons): {
  root: HTMLElement;
  track: HTMLElement;
  viewport: HTMLElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
} {
  const root = document.createElement("div");
  root.className = "article-tiptap-split-carousel";
  root.setAttribute("role", "region");
  root.setAttribute("aria-roledescription", "carousel");
  root.setAttribute("aria-label", "Galerie de variantes");

  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "article-tiptap-split-carousel__btn article-tiptap-split-carousel__btn--prev";
  prev.setAttribute("aria-label", "Variante précédente");
  prev.innerHTML = svgWithIconClass(icons.prevSvg);

  const next = document.createElement("button");
  next.type = "button";
  next.className = "article-tiptap-split-carousel__btn article-tiptap-split-carousel__btn--next";
  next.setAttribute("aria-label", "Variante suivante");
  next.innerHTML = svgWithIconClass(icons.nextSvg);

  const viewport = document.createElement("div");
  viewport.className = "article-tiptap-split-carousel__viewport";

  const track = document.createElement("div");
  track.className = "article-tiptap-split-carousel__track";

  viewport.appendChild(track);
  root.appendChild(prev);
  root.appendChild(viewport);
  root.appendChild(next);

  return { root, track, viewport, prev, next };
}

function finalizeRun(
  track: HTMLElement,
  run: HTMLElement[],
  viewport: HTMLElement,
  prev: HTMLButtonElement,
  next: HTMLButtonElement,
): () => void {
  for (const split of run) {
    split.classList.add("article-tiptap-split--carousel-slide");
    track.appendChild(split);
  }
  return wireCarousel(viewport, prev, next);
}

/** Cleanup Strict Mode : remettre les sections comme enfants directs du conteneur article. */
function restoreArticleSplitCarousels(container: HTMLElement): void {
  const roots = Array.from(container.querySelectorAll(":scope > .article-tiptap-split-carousel")).filter(
    (n): n is HTMLElement => n instanceof HTMLElement,
  );
  for (const root of roots) {
    const track = root.querySelector(":scope .article-tiptap-split-carousel__track");
    if (!(track instanceof HTMLElement)) {
      root.remove();
      continue;
    }
    const slides = Array.from(track.children).filter((n): n is HTMLElement => n instanceof HTMLElement);
    const parent = root.parentElement;
    if (!parent) continue;
    for (const slide of slides) {
      slide.classList.remove("article-tiptap-split--carousel-slide");
    }
    const frag = document.createDocumentFragment();
    for (const slide of slides) {
      frag.appendChild(slide);
    }
    parent.insertBefore(frag, root);
    root.remove();
  }
}

export function mountArticleSplitCarousels(
  container: HTMLElement,
  icons: MountSplitCarouselIcons,
  options?: MountSplitCarouselOptions,
): () => void {
  const skipLeading = Math.max(0, options?.skipLeadingSplits ?? 0);
  const excludeHeading = Boolean(options?.excludeSplitsWithHeadingInCopy);
  stripEmptyGapsBetweenDirectSiblingSplits(container);
  const runs = collectSplitRuns(container, skipLeading, excludeHeading);
  if (runs.length === 0) {
    return () => {};
  }

  const cleanups: (() => void)[] = [];

  for (const run of runs) {
    const anchor = run[0];
    const parent = anchor.parentElement;
    if (!parent) continue;

    const shell = buildShell(icons);
    parent.insertBefore(shell.root, anchor);
    cleanups.push(finalizeRun(shell.track, run, shell.viewport, shell.prev, shell.next));
  }

  return () => {
    for (const c of cleanups) c();
    restoreArticleSplitCarousels(container);
  };
}
