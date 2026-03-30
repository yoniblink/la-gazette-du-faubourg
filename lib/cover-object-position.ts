/** Valeur CSS `object-position` pour les images de couverture. */
export const DEFAULT_COVER_OBJECT_POSITION = "50% 50%" as const;

export function parseCoverFocus(s: string | undefined | null): { x: number; y: number } {
  if (!s?.trim()) return { x: 50, y: 50 };
  const normalized = s.trim().replace(/\s+/g, " ");
  const m = /^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/.exec(normalized);
  if (!m) return { x: 50, y: 50 };
  return {
    x: Math.min(100, Math.max(0, Number(m[1]))),
    y: Math.min(100, Math.max(0, Number(m[2]))),
  };
}

export function normalizeCoverObjectPosition(raw: string): string {
  const { x, y } = parseCoverFocus(raw);
  const rx = Math.round(x * 10) / 10;
  const ry = Math.round(y * 10) / 10;
  return `${rx}% ${ry}%`;
}
