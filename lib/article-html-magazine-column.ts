import { parse, type HTMLElement } from "node-html-parser";

/** Début d’un bloc « infos pratiques » (filet doré + alignement à gauche). */
function isCtaLeader(raw: string): boolean {
  const t = raw.trimStart();
  const l = t.toLowerCase();
  if (t.startsWith("Édition limitée") || t.startsWith("Edition limitée")) return true;
  if (t.startsWith("Tea Time de Pâques")) return true;
  if (l.startsWith("brunch de pâques") || l.startsWith("brunch de paques")) {
    return t.length < 360 || /€/.test(t);
  }
  if (l.startsWith("un brunch") && /pâques|paques|€|personne|salon/.test(l)) {
    return t.length < 360 || /€/.test(t);
  }
  if (l.startsWith("brunch ") && /€|personne|menu|salon/.test(l)) return true;
  if (/^\d/.test(t) && /€/.test(t.slice(0, 120))) return true;
  if (l.startsWith("menu ") && t.length < 220) return true;
  if (l.startsWith("tarif")) return true;
  if (l.startsWith("dimanche ") && /\d{4}/.test(t)) return true;
  if (l.startsWith("samedi ") && /\d{4}/.test(t)) return true;
  return false;
}

/** Suite logistique / tarifs dans le même bloc que le paragraphe précédent. */
function isCtaFollower(prevRaw: string, candRaw: string): boolean {
  const c = candRaw.trimStart();
  const cl = c.toLowerCase();
  const p = prevRaw.trimStart().toLowerCase();
  if (c.length > 400) return false;
  if (cl.startsWith("pourquoi ") || (cl.startsWith("le chef ") && c.length > 140)) return false;
  if (cl.startsWith("dimanche ") || cl.startsWith("samedi ") || cl.startsWith("vendredi ")) return true;
  if (cl.startsWith("pour réserver") || cl.startsWith("réservation") || cl.startsWith("reservation"))
    return true;
  if (/€/.test(c)) return true;
  if (/\d{1,2}\s*h\s*\d{2}/i.test(c) || /\d{1,2}h\d{2}/.test(c)) return true;
  if (p.includes("€") && c.length < 260) return true;
  if (/\d{4}/.test(prevRaw) && /service|personne|€/i.test(cl) && c.length < 260) return true;
  return false;
}

function isStandaloneImageBlock(el: HTMLElement): boolean {
  if (el.classList.contains("article-tiptap-img-zoom-wrap")) return true;
  const tag = el.tagName.toLowerCase();
  if (tag === "figure" && el.classList.contains("article-tiptap-figure")) return true;
  return false;
}

/** Trois images bloc séparées TipTap → une rangée pleine largeur (comme maquette « 3 pâtisseries »). */
function wrapTripleImageRows(container: HTMLElement) {
  let el = container.firstElementChild as HTMLElement | null;
  while (el) {
    if (!isStandaloneImageBlock(el)) {
      el = el.nextElementSibling as HTMLElement | null;
      continue;
    }
    const group: HTMLElement[] = [];
    let cur: HTMLElement | null = el;
    while (cur && isStandaloneImageBlock(cur) && group.length < 3) {
      group.push(cur);
      cur = cur.nextElementSibling as HTMLElement | null;
    }
    if (group.length === 3) {
      const afterGroup = cur;
      const row = parse(
        `<div class="article-magazine-triple-row" role="presentation"></div>`,
      ).firstChild as HTMLElement;
      group[0].before(row);
      for (const node of group) row.appendChild(node);
      el = afterGroup;
      continue;
    }
    el = el.nextElementSibling as HTMLElement | null;
  }
}

/** Retire largeurs fixes (attributs / style) pour que le CSS impose 100 % de la colonne. */
function normalizeMagazineImageSizing(container: HTMLElement) {
  for (const node of container.querySelectorAll("img")) {
    const img = node as HTMLElement;
    img.removeAttribute("width");
    img.removeAttribute("height");
    const style = img.getAttribute("style");
    if (!style?.trim()) continue;
    const parts = style
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((decl) => {
        const prop = decl.split(":")[0]?.trim().toLowerCase();
        return prop !== "width" && prop !== "max-width" && prop !== "min-width" && prop !== "height";
      });
    if (parts.length) img.setAttribute("style", `${parts.join("; ")};`);
    else img.removeAttribute("style");
  }
}

function wrapMagazineCtaBlocks(container: HTMLElement) {
  let el = container.firstElementChild as HTMLElement | null;
  while (el) {
    if (el.tagName.toLowerCase() === "p" && isCtaLeader(el.text)) {
      const group: HTMLElement[] = [el];
      let nx = el.nextElementSibling as HTMLElement | null;
      while (nx && nx.tagName.toLowerCase() === "p") {
        const last = group[group.length - 1]!;
        if (!isCtaFollower(last.text, nx.text)) break;
        group.push(nx);
        nx = nx.nextElementSibling as HTMLElement | null;
      }

      const afterGroup = nx;
      const first = group[0]!;
      if (first.parentNode) {
        const aside = parse(
          `<aside class="article-magazine-cta" aria-label="Informations pratiques"></aside>`,
        ).firstChild as HTMLElement;
        const rule = parse(`<div class="article-magazine-cta__rule" aria-hidden="true"></div>`)
          .firstChild as HTMLElement;
        aside.appendChild(rule);
        first.before(aside);
        for (const p of group) {
          aside.appendChild(p);
          p.innerHTML = p.innerHTML.replace(
            /<strong>en ligne<\/strong>/gi,
            '<strong class="article-magazine-cta__accent">en ligne</strong>',
          );
        }
      }
      el = afterGroup;
      continue;
    }

    el = el.nextElementSibling as HTMLElement | null;
  }
}

/**
 * Enrichit le HTML article pour la variante « magazine » : blocs offre avec filet doré.
 */
export function applyMagazineColumnEnhancements(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return html;

  const wrapper = parse(`<div id="__mc">${trimmed}</div>`);
  const container = wrapper.querySelector("#__mc");
  if (!container) return html;

  wrapTripleImageRows(container);
  wrapMagazineCtaBlocks(container);

  normalizeMagazineImageSizing(container);

  return container.innerHTML;
}
