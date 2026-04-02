import { NodeType, parse, type HTMLElement } from "node-html-parser";

/**
 * Regroupe les blocs « image puis texte(s) » comme sur la page Elementor :
 * conteneur flex en colonne (mobile) puis en ligne ≥768px (cf. 1c4981a + a237241).
 */
export function applyElementorArticleLayout(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return html;

  const root = parse(trimmed, { comment: false });
  const blocks = root.childNodes.filter(
    (n): n is HTMLElement => n.nodeType === NodeType.ELEMENT_NODE,
  );

  if (blocks.length === 0) return html;

  const out = parse("<div></div>").firstChild as HTMLElement;

  /** Seule la 2e paire d’images (pair[1] dans le DOM) est en pile ; les autres restent côte à côte. */
  let pairIndex = 0;

  /** Comme eef2d28 : première image pleine largeur si elle est suivie d’un second bloc média (rangée image|texte). */
  let i = 0;
  if (
    blocks.length >= 2 &&
    isMediaBlock(blocks[0]) &&
    isMediaBlock(blocks[1])
  ) {
    const heroWrap = parse(
      `<div class="article-tiptap-lead-media" role="presentation"></div>`,
    ).firstChild as HTMLElement;
    heroWrap.appendChild(blocks[0]);
    out.appendChild(heroWrap);
    i = 1;
  }

  while (i < blocks.length) {
    const el = blocks[i];

    if (isMediaBlock(el)) {
      let j = i + 1;
      while (j < blocks.length && !isMediaBlock(blocks[j])) {
        j += 1;
      }

      if (j === i + 1) {
        /* Deux images consécutives → côte à côte (paire). */
        const nextEl = blocks[j]; // === blocks[i + 1]
        if (nextEl) {
          /* Cherche combien de blocs texte suivent la seconde image avant la prochaine image. */
          let j2 = j + 1;
          while (j2 < blocks.length && !isMediaBlock(blocks[j2])) {
            j2 += 1;
          }

          const stackClass = pairIndex === 1 ? " article-tiptap-pair--stack" : "";
          const pairRow = parse(
            `<div class="article-tiptap-pair${stackClass}" role="presentation"></div>`,
          ).firstChild as HTMLElement;
          pairIndex += 1;
          pairRow.appendChild(el);
          pairRow.appendChild(nextEl);
          out.appendChild(pairRow);

          /* Si la 2e image avait du texte (ex-split__copy), on le sort en blocs indépendants. */
          for (let k = j + 1; k < j2; k += 1) {
            out.appendChild(blocks[k]);
          }

          i = j2;
          continue;
        }
        out.appendChild(el);
        i += 1;
        continue;
      }

      const section = parse(
        `<section class="article-tiptap-split" aria-label="Bloc éditorial"></section>`,
      ).firstChild as HTMLElement;
      const mediaCol = parse(`<div class="article-tiptap-split__media"></div>`).firstChild as HTMLElement;
      const copyCol = parse(`<div class="article-tiptap-split__copy"></div>`).firstChild as HTMLElement;

      mediaCol.appendChild(el);
      for (let k = i + 1; k < j; k += 1) {
        copyCol.appendChild(blocks[k]);
      }

      section.appendChild(mediaCol);
      section.appendChild(copyCol);
      out.appendChild(section);
      i = j;
    } else {
      out.appendChild(el);
      i += 1;
    }
  }

  groupConsecutiveSplitsIntoCarousels(out);

  return out.innerHTML;
}

/** Regroupe les blocs split consécutifs (≥2) en carrousel horizontal (cf. galerie produits Elementor). */
function groupConsecutiveSplitsIntoCarousels(out: HTMLElement): void {
  const snapshot: HTMLElement[] = [];
  let c: HTMLElement | null = (out.firstElementChild as HTMLElement | undefined) ?? null;
  while (c != null) {
    const next = (c.nextElementSibling as HTMLElement | undefined) ?? null;
    snapshot.push(c);
    out.removeChild(c);
    c = next;
  }

  let i = 0;
  while (i < snapshot.length) {
    const node = snapshot[i]!;
    if (!isSplitSection(node)) {
      out.appendChild(node);
      i += 1;
      continue;
    }
    let j = i + 1;
    while (j < snapshot.length && isSplitSection(snapshot[j]!)) {
      j += 1;
    }
    const run = snapshot.slice(i, j);
    for (const chunk of partitionSplitRunForCarousel(run)) {
      if (chunk.kind === "carousel") {
        out.appendChild(buildSplitCarousel(chunk.nodes));
      } else {
        for (const n of chunk.nodes) {
          out.appendChild(n);
        }
      }
    }
    i = j;
  }
}

/** Bloc « hero » éditorial (gros titre + texte) : hors carrousel, au-dessus de la galerie produits. */
const CAROUSEL_EXCLUDE_MIN_PARAGRAPH_CHARS = 160;

function isCarouselExcludedSplit(el: HTMLElement): boolean {
  const copy = el.querySelector(".article-tiptap-split__copy");
  if (!copy) return false;
  const majorHeading = copy.querySelector(":scope > h1, :scope > h2");
  if (!majorHeading) return false;
  let paragraphChars = 0;
  for (const p of copy.querySelectorAll(":scope > p")) {
    paragraphChars += (p.textContent || "").trim().length;
  }
  return paragraphChars >= CAROUSEL_EXCLUDE_MIN_PARAGRAPH_CHARS;
}

type CarouselPartitionChunk =
  | { kind: "carousel"; nodes: HTMLElement[] }
  | { kind: "singles"; nodes: HTMLElement[] };

function partitionSplitRunForCarousel(run: HTMLElement[]): CarouselPartitionChunk[] {
  const chunks: CarouselPartitionChunk[] = [];
  let buf: HTMLElement[] = [];

  const flushBuf = () => {
    if (buf.length === 0) return;
    if (buf.length >= 2) {
      chunks.push({ kind: "carousel", nodes: [...buf] });
    } else {
      chunks.push({ kind: "singles", nodes: [...buf] });
    }
    buf = [];
  };

  for (const node of run) {
    if (isCarouselExcludedSplit(node)) {
      flushBuf();
      chunks.push({ kind: "singles", nodes: [node] });
    } else {
      buf.push(node);
    }
  }
  flushBuf();
  return chunks;
}

function isSplitSection(el: HTMLElement): boolean {
  return (
    el.tagName.toLowerCase() === "section" &&
    el.classList.contains("article-tiptap-split")
  );
}

const CAROUSEL_PREV_SVG = `<svg class="article-tiptap-split-carousel__icon" width="11" height="20" viewBox="0 0 11 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10 1L2 10l8 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CAROUSEL_NEXT_SVG = `<svg class="article-tiptap-split-carousel__icon" width="11" height="20" viewBox="0 0 11 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M1 1l8 9-8 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function buildSplitCarousel(slides: HTMLElement[]): HTMLElement {
  const wrap = parse(
    `<div class="article-tiptap-split-carousel" role="region" aria-label="Galerie de modèles"></div>`,
  ).firstChild as HTMLElement;
  const prev = parse(
    `<button type="button" class="article-tiptap-split-carousel__btn article-tiptap-split-carousel__btn--prev" aria-label="Précédent">${CAROUSEL_PREV_SVG}</button>`,
  ).firstChild as HTMLElement;
  const next = parse(
    `<button type="button" class="article-tiptap-split-carousel__btn article-tiptap-split-carousel__btn--next" aria-label="Suivant">${CAROUSEL_NEXT_SVG}</button>`,
  ).firstChild as HTMLElement;
  const viewport = parse(
    `<div class="article-tiptap-split-carousel__viewport"></div>`,
  ).firstChild as HTMLElement;
  const track = parse(
    `<div class="article-tiptap-split-carousel__track"></div>`,
  ).firstChild as HTMLElement;

  for (const slide of slides) {
    slide.classList.add("article-tiptap-split--carousel-slide");
    track.appendChild(slide);
  }

  viewport.appendChild(track);
  wrap.appendChild(prev);
  wrap.appendChild(viewport);
  wrap.appendChild(next);
  return wrap;
}

function isMediaBlock(el: HTMLElement): boolean {
  const t = el.tagName.toLowerCase();
  if (t === "figure") {
    return true;
  }
  if (t !== "div") {
    return false;
  }
  return (
    el.classList.contains("article-tiptap-img-zoom-wrap") ||
    el.classList.contains("article-tiptap-gallery")
  );
}
