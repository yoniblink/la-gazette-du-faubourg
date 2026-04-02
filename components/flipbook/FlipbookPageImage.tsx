"use client";

import Image from "next/image";
import { memo, useEffect, useRef, useState } from "react";

export type FlipbookPageImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  index: number;
  currentPage: number;
  /** Rayon autour de `currentPage` pour forcer `loading="eager"` (défaut ±2). */
  eagerRadius?: number;
  /** `priority` Next/Image uniquement pour les `index < priorityCount` (défaut 3). */
  priorityCount?: number;
  sizes: string;
  onLoadComplete?: (index: number) => void;
};

/**
 * Image flipbook : skeleton anti flash, fondu à la révélation, URLs CDN inchangées (`unoptimized`).
 */
export const FlipbookPageImage = memo(function FlipbookPageImage({
  src,
  alt,
  width,
  height,
  index,
  currentPage,
  eagerRadius = 2,
  priorityCount = 3,
  sizes,
  onLoadComplete,
}: FlipbookPageImageProps) {
  const [visible, setVisible] = useState(false);
  const onLoadCompleteRef = useRef(onLoadComplete);

  useEffect(() => {
    onLoadCompleteRef.current = onLoadComplete;
  }, [onLoadComplete]);

  const eagerNear = Math.abs(index - currentPage) <= eagerRadius;
  const isPriority = index < priorityCount;
  /** Next.js : `priority` et `loading="lazy"` sont incompatibles sur la même image. */
  const loadingProp =
    isPriority ? undefined : eagerNear ? ("eager" as const) : ("lazy" as const);

  return (
    <div className="relative h-full w-full">
      {!visible ? (
        <div
          className="absolute inset-0 animate-pulse bg-stone-300/90"
          aria-hidden
        />
      ) : null}
      <div className="block h-full w-full" data-zoom-handled="true">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          quality={100}
          unoptimized
          priority={isPriority}
          data-no-zoom="true"
          {...(loadingProp !== undefined ? { loading: loadingProp } : {})}
          draggable={false}
          className={`h-full w-full select-none object-contain transition-opacity duration-500 ease-out motion-reduce:transition-none cursor-default ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => {
            setVisible(true);
            onLoadCompleteRef.current?.(index);
          }}
          onError={() => {
            setVisible(true);
            onLoadCompleteRef.current?.(index);
          }}
        />
      </div>
    </div>
  );
}, areFlipbookPageImagePropsEqual);

function areFlipbookPageImagePropsEqual(
  a: FlipbookPageImageProps,
  b: FlipbookPageImageProps,
): boolean {
  return (
    a.src === b.src &&
    a.alt === b.alt &&
    a.width === b.width &&
    a.height === b.height &&
    a.index === b.index &&
    a.currentPage === b.currentPage &&
    a.eagerRadius === b.eagerRadius &&
    a.priorityCount === b.priorityCount &&
    a.sizes === b.sizes
  );
}
