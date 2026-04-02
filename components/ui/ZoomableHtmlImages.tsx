"use client";

import { useEffect, useMemo, useState } from "react";
import { Lightbox } from "@/components/ui/Lightbox";

type Props = {
  /** Optionnel: limite le handler à un conteneur (évite d'accrocher tout le document). */
  containerSelector?: string;
};

function isInInteractive(el: Element | null): boolean {
  if (!el) return false;
  return Boolean(el.closest("a, button, input, textarea, select, summary, [role='button']"));
}

export function ZoomableHtmlImages({ containerSelector }: Props) {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState("");
  const [alt, setAlt] = useState<string | undefined>(undefined);

  const selector = useMemo(
    () => (containerSelector ? `${containerSelector} img` : "img"),
    [containerSelector],
  );

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-zoom-handled="true"]')) return;

      const img = target.closest(selector);
      if (!img) return;
      if (!(img instanceof HTMLImageElement)) return;
      if (isInInteractive(img)) return;
      if (img.getAttribute("data-no-zoom") === "true") return;

      const w = img.naturalWidth || 0;
      const h = img.naturalHeight || 0;
      if (w > 0 && h > 0 && w < 180 && h < 180) return;

      const s = img.currentSrc || img.src;
      if (!s) return;

      e.preventDefault();
      e.stopPropagation();
      setSrc(s);
      setAlt(img.getAttribute("alt") ?? "");
      setOpen(true);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [selector]);

  return <Lightbox open={open} src={src} alt={alt} onClose={() => setOpen(false)} />;
}

