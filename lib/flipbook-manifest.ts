/** Données pré-rendues côté serveur (WebP sur Supabase) pour le flipbook. */
export type FlipbookManifest = {
  v: 1;
  pageUrls: string[];
  fullSpreadSlot: boolean[];
  pageW: number;
  pageH: number;
  /** Nombre de pages dans le fichier PDF. */
  totalPdfPages: number;
  /** Pages PDF effectivement rasterisées (plafonnées côté serveur si besoin). */
  renderedPdfPages: number;
};

export function parseFlipbookManifest(raw: string | null | undefined): FlipbookManifest | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as FlipbookManifest;
    if (o.v !== 1 || !Array.isArray(o.pageUrls) || !Array.isArray(o.fullSpreadSlot)) return null;
    if (typeof o.pageW !== "number" || typeof o.pageH !== "number") return null;
    if (o.pageUrls.length === 0 || o.pageUrls.length !== o.fullSpreadSlot.length) return null;
    if (typeof o.totalPdfPages !== "number") return null;
    const renderedPdfPages =
      typeof o.renderedPdfPages === "number" ? o.renderedPdfPages : o.totalPdfPages;
    return { ...o, renderedPdfPages };
  } catch {
    return null;
  }
}

export function serializeFlipbookManifest(m: FlipbookManifest): string {
  return JSON.stringify(m);
}
