"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { FlipbookPageImage } from "@/components/flipbook/FlipbookPageImage";
import { useFlipbookLinkPreload } from "@/hooks/useFlipbookLinkPreload";
import { useFlipbookLoadedPages } from "@/hooks/useFlipbookLoadedPages";
import { useFlipbookPreload } from "@/hooks/useFlipbookPreload";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HTMLFlipBook = dynamic(() => import("react-pageflip").then((m) => m.default), { ssr: false }) as any;

type PageFlipEvent = { data: unknown; object: unknown };

function pageIndexFromFlipEvent(e: PageFlipEvent): number {
  const d = e.data;
  if (typeof d === "number" && Number.isFinite(d)) return d;
  if (d && typeof d === "object" && "page" in d) {
    const p = (d as { page: unknown }).page;
    if (typeof p === "number" && Number.isFinite(p)) return p;
  }
  return 0;
}

export type HomeFlipbookViewerProps = {
  pageUrls: string[];
  fullSpreadSlot: boolean[];
  pageW: number;
  pageH: number;
  totalPdfPages: number;
};

export function HomeFlipbookViewer({
  pageUrls,
  fullSpreadSlot,
  pageW,
  pageH,
  totalPdfPages,
}: HomeFlipbookViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const { markLoaded } = useFlipbookLoadedPages(pageUrls.length);

  useFlipbookPreload(pageUrls, currentPage);
  useFlipbookLinkPreload(pageUrls, 3);

  const handleFlip = useCallback((e: PageFlipEvent) => {
    setCurrentPage(pageIndexFromFlipEvent(e));
  }, []);

  const handleInitOrUpdate = useCallback((e: PageFlipEvent) => {
    setCurrentPage(pageIndexFromFlipEvent(e));
  }, []);

  const w = Math.max(120, Math.round(pageW));
  const h = Math.max(160, Math.round(pageH));
  const sizes = "(max-width: 768px) 95vw, 680px";

  if (!HTMLFlipBook) return null;

  return (
    <HTMLFlipBook
      width={pageW}
      height={pageH}
      size="stretch"
      minWidth={280}
      maxWidth={680}
      minHeight={380}
      maxHeight={1100}
      showCover
      maxShadowOpacity={0.45}
      mobileScrollSupport
      className="mx-auto w-full max-w-[min(100%,1360px)]"
      style={{ marginTop: "0.5rem" }}
      onFlip={handleFlip}
      onInit={handleInitOrUpdate}
      onUpdate={handleInitOrUpdate}
    >
      {pageUrls.map((src, i) => {
        const full = fullSpreadSlot[i] === true;
        const edgeLabel =
          totalPdfPages <= 1
            ? ""
            : i === 0
              ? " — couverture"
              : i === pageUrls.length - 1
                ? " — fin"
                : "";
        return (
          <div
            key={`${src}-${i}`}
            className={`relative h-full w-full overflow-hidden border border-black/[0.08] bg-stone-200 ${
              full ? "" : "flex items-stretch justify-stretch"
            }`}
          >
            <FlipbookPageImage
              src={src}
              alt={full ? `Page PDF${edgeLabel}` : `Page intérieure ${i + 1}`}
              width={w}
              height={h}
              index={i}
              currentPage={currentPage}
              eagerRadius={2}
              priorityCount={3}
              sizes={sizes}
              onLoadComplete={markLoaded}
            />
          </div>
        );
      })}
    </HTMLFlipBook>
  );
}
