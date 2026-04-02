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

  return out.innerHTML;
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
