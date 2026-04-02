"use client";

import { useEffect } from "react";
import Image from "next/image";

export type LightboxProps = {
  open: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
};

export function Lightbox({ open, src, alt, onClose }: LightboxProps) {
  useEffect(() => {
    if (!open) return;

    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Fermer"
        className="absolute right-3 top-3 rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        Fermer
      </button>
      <Image
        src={src}
        alt={alt ?? ""}
        width={2400}
        height={1600}
        className="max-h-[92vh] w-auto max-w-[92vw] select-none object-contain"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
        unoptimized
      />
    </div>
  );
}

