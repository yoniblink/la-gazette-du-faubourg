"use client";
import { useEffect, useState } from "react";
import { HomeFlipbookViewer } from "@/components/flipbook/HomeFlipbookViewer";
import type { FlipbookManifest } from "@/lib/flipbook-manifest";
import { MotionDiv } from "@/components/motion-prefers";
import { fadeUp } from "@/lib/motion";

type ManifestResponse = { manifest: FlipbookManifest | null };

export function HomeFlipbook({
  pdfUrl,
  initialManifest,
  /** Sur une rubrique (ex. La Revue) : fond transparent, sans bordures ni dégradé. */
  embedded = false,
}: {
  pdfUrl: string;
  initialManifest: FlipbookManifest | null;
  embedded?: boolean;
}) {
  const [manifest, setManifest] = useState<FlipbookManifest | null>(initialManifest);
  const [pollN, setPollN] = useState(0);

  const needPoll =
    Boolean(pdfUrl.startsWith("http")) && manifest === null && pollN < 90;

  useEffect(() => {
    setManifest(initialManifest);
  }, [initialManifest]);

  useEffect(() => {
    if (!needPoll) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const r = await fetch("/api/flipbook/manifest", { cache: "no-store" });
        const j = (await r.json()) as ManifestResponse;
        if (cancelled) return;
        if (j.manifest?.pageUrls?.length) {
          setManifest(j.manifest);
          return;
        }
        setPollN((n) => n + 1);
      } catch {
        if (cancelled) return;
        setPollN((n) => n + 1);
      }

      if (cancelled) return;
      timer = setTimeout(tick, 2000);
    };

    timer = setTimeout(tick, 2000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [needPoll]);

  const phase =
    manifest && manifest.pageUrls.length > 0
      ? ("ready" as const)
      : pdfUrl.startsWith("http")
        ? ("waiting" as const)
        : ("localPdf" as const);

  const {
    pageUrls = [],
    fullSpreadSlot = [],
    pageW = 480,
    pageH = 672,
    totalPdfPages = 0,
    renderedPdfPages = 0,
  } = manifest ?? {};
  const flipbookInstanceKey = pageUrls.length ? pageUrls.join("\u0000") : "empty";

  return (
    <section
      id="flipbook"
      className={
        embedded
          ? "scroll-mt-24 bg-transparent py-12 max-[768px]:py-8 md:py-16"
          : "scroll-mt-24 border-y border-black/[0.06] bg-transparent py-20 max-[768px]:py-14 max-[1024px]:py-16 md:py-28"
      }
    >
      <div
        className={
          embedded
            ? "mx-auto w-full min-w-0 max-w-6xl px-6 max-[768px]:px-4 md:px-10"
            : "mx-auto max-w-6xl px-6 max-[768px]:px-4 md:px-10"
        }
      >
        {!embedded ? (
          <MotionDiv
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-10% 0px" }}
            className="text-center"
          >
            <h2
              className="mx-auto w-max max-w-full text-center text-[34px] font-normal italic leading-tight tracking-tight text-black max-[768px]:w-full max-[768px]:text-balance max-[1024px]:px-1 lg:text-[48px] lg:leading-[1.12]"
              style={{ fontFamily: "Griffiths, serif" }}
            >
              Découvrez La Gazette du Faubourg en format papier.
              <span className="mt-2 block text-[0.88em] font-normal italic leading-tight tracking-tight text-[#3a3a3a]">
                Présente là où l’élégance se vit…
              </span>
            </h2>
          </MotionDiv>
        ) : null}

        <div
          className={`flex min-h-[min(70vh,520px)] w-full flex-col items-center justify-center ${embedded ? "mt-0" : "mt-12"}`}
        >
          {phase === "waiting" ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="font-[family-name:var(--font-sans)] text-sm text-[#5a5a5a]">
                Préparation des pages… ({Math.min(100, Math.round((pollN / 90) * 100))} % estimé)
              </p>
              <p className="max-w-md text-xs text-[#888]">
                La génération des images peut prendre une minute après le téléversement du PDF.
              </p>
            </div>
          ) : null}

          {phase === "localPdf" ? (
            <p className="max-w-md text-center font-[family-name:var(--font-sans)] text-sm text-[#5a5a5a]">
              Flipbook indisponible en prévisualisation locale pour ce PDF. Utilisez le lien ci-dessous ou
              téléversez via Supabase en production.
            </p>
          ) : null}

          {phase === "ready" ? (
            <HomeFlipbookViewer
              key={flipbookInstanceKey}
              pageUrls={pageUrls}
              fullSpreadSlot={fullSpreadSlot}
              pageW={pageW}
              pageH={pageH}
              totalPdfPages={totalPdfPages}
            />
          ) : null}
        </div>

        {phase === "ready" || phase === "waiting" || phase === "localPdf" ? (
          <div className="mt-10 flex flex-col items-center gap-3 text-center font-[family-name:var(--font-sans)] text-sm text-[#5a5a5a]">
            {totalPdfPages > renderedPdfPages ? (
              <p>
                Aperçu de {renderedPdfPages} page{renderedPdfPages > 1 ? "s" : ""} PDF sur {totalPdfPages}.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
