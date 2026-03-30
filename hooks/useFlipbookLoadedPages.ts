import { useCallback, useRef } from "react";

/**
 * Suivi léger des pages dont l’image a déclenché `onLoad` (cache pour extensions / debug).
 * `react-pageflip` n’expose pas d’annulation propre du geste de flip : on mise sur le préchargement
 * + `FlipbookPageImage` plutôt que sur un blocage dur au début du geste.
 */
export function useFlipbookLoadedPages(pageCount: number) {
  const loadedRef = useRef<Set<number>>(new Set());

  const reset = useCallback(() => {
    loadedRef.current = new Set();
  }, []);

  const markLoaded = useCallback((index: number) => {
    if (index < 0 || index >= pageCount) return;
    loadedRef.current.add(index);
  }, [pageCount]);

  const isLoaded = useCallback((index: number) => {
    if (index < 0 || index >= pageCount) return false;
    return loadedRef.current.has(index);
  }, [pageCount]);

  return { markLoaded, isLoaded, reset } as const;
}
