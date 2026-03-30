import { useEffect } from "react";

/**
 * Ajoute des `<link rel="preload" as="image">` pour les premières pages (LCP + cache immédiat).
 * Nettoyage au démontage ou quand la liste d’URLs change.
 */
export function useFlipbookLinkPreload(urls: readonly string[], count = 3): void {
  const urlsKey = urls.join("\u0000");

  useEffect(() => {
    if (typeof document === "undefined") return;

    const n = Math.max(0, Math.min(count, urls.length));
    if (n === 0) return;

    const links: HTMLLinkElement[] = [];
    for (let i = 0; i < n; i++) {
      const href = urls[i];
      if (!href) continue;
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = href;
      if (i === 0) link.setAttribute("fetchpriority", "high");
      document.head.appendChild(link);
      links.push(link);
    }

    return () => {
      for (const link of links) {
        link.remove();
      }
    };
  }, [urlsKey, count, urls]);
}
