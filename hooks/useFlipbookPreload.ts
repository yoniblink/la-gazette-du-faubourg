import { useEffect, useRef } from "react";

/** Nombre de pages après la page courante à réchauffer dans le cache navigateur. */
const DEFAULT_LOOKAHEAD = 2;
/** Pages en arrière (retour rapide). */
const DEFAULT_LOOKBEHIND = 1;

/**
 * Précharge les URLs via `Image()` pour peupler le cache HTTP du navigateur,
 * en phase avec la page affichée (anticipation au feuilletage).
 */
export function useFlipbookPreload(
  urls: readonly string[],
  currentPage: number,
  options?: { lookahead?: number; lookbehind?: number },
): void {
  const warmedRef = useRef<Set<string>>(new Set());
  const urlsKeyRef = useRef<string>("");
  const lookahead = options?.lookahead ?? DEFAULT_LOOKAHEAD;
  const lookbehind = options?.lookbehind ?? DEFAULT_LOOKBEHIND;
  const urlsKey = urls.join("\u0000");

  useEffect(() => {
    if (urlsKey !== urlsKeyRef.current) {
      warmedRef.current.clear();
      urlsKeyRef.current = urlsKey;
    }
  }, [urlsKey]);

  useEffect(() => {
    if (!urls.length) return;

    const indices = new Set<number>();
    for (let d = 0; d <= lookahead; d++) {
      const i = currentPage + d;
      if (i >= 0 && i < urls.length) indices.add(i);
    }
    for (let d = 1; d <= lookbehind; d++) {
      const i = currentPage - d;
      if (i >= 0 && i < urls.length) indices.add(i);
    }

    for (const i of indices) {
      const url = urls[i];
      if (!url) continue;
      if (warmedRef.current.has(url)) continue;
      warmedRef.current.add(url);
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    }
  }, [urls, urlsKey, urls.length, currentPage, lookahead, lookbehind]);
}
