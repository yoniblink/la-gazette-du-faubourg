"use client";

import Image, { type ImageProps } from "next/image";
import { useCallback, useState } from "react";
import { Lightbox } from "@/components/ui/Lightbox";

type ZoomableImageProps = Omit<ImageProps, "onClick"> & {
  /** Empêche le clic de remonter (utile dans flipbook / carrousels). */
  stopPropagation?: boolean;
};

export function ZoomableImage({
  src,
  alt,
  stopPropagation = true,
  ...rest
}: ZoomableImageProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const isFill = "fill" in rest && rest.fill === true;

  const srcString =
    typeof src === "string"
      ? src
      : "src" in src
        ? (src.src as string)
        : String(src);

  return (
    <>
      <button
        type="button"
        className={isFill ? "absolute inset-0" : "contents"}
        data-zoom-handled="true"
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        aria-label={(alt?.trim() ? `Agrandir : ${alt}` : "Agrandir l’image") as string}
      >
        <Image
          {...rest}
          src={src}
          alt={alt}
          data-zoomable="true"
          className={[rest.className, "cursor-zoom-in"].filter(Boolean).join(" ")}
        />
      </button>
      <Lightbox open={open} src={srcString} alt={alt} onClose={close} />
    </>
  );
}

