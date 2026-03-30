"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FlipbookManifest } from "@/lib/flipbook-manifest";
import { MotionDiv } from "@/components/motion-prefers";
import { fadeUp } from "@/lib/motion";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HTMLFlipBook = dynamic(() => import("react-pageflip").then((m) => m.default), { ssr: false }) as any;

type ManifestResponse = { manifest: FlipbookManifest | null };

export function HomeFlipbook({
  pdfUrl,
  initialManifest,
}: {
  pdfUrl: string;
  initialManifest: FlipbookManifest | null;
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
    const t = setInterval(async () => {
      try {
        const r = await fetch("/api/flipbook/manifest", { cache: "no-store" });
        const j = (await r.json()) as ManifestResponse;
        if (j.manifest?.pageUrls?.length) {
          setManifest(j.manifest);
        } else {
          setPollN((n) => n + 1);
        }
      } catch {
        setPollN((n) => n + 1);
      }
    }, 2000);
    return () => clearInterval(t);
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
    pageW = 400,
    pageH = 560,
    totalPdfPages = 0,
    renderedPdfPages = 0,
  } = manifest ?? {};

  return (
    <section id="flipbook" className="scroll-mt-24 border-y border-black/[0.06] bg-[#fafafa] py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <MotionDiv
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10% 0px" }}
          className="text-center"
        >
          <h2 className="font-[family-name:var(--font-serif)] text-[clamp(1.65rem,3vw,2.35rem)] font-light leading-snug text-[#0a0a0a]">
            Feuilletez le magazine
          </h2>
        </MotionDiv>

        <div className="mt-12 flex min-h-[min(70vh,520px)] w-full flex-col items-center justify-center">
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

          {phase === "ready" && HTMLFlipBook ? (
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
                    <Image
                      src={src}
                      alt={full ? `Page PDF${edgeLabel}` : `Page intérieure ${i + 1}`}
                      width={Math.max(120, Math.round(pageW))}
                      height={Math.max(160, Math.round(pageH))}
                      className="h-full w-full select-none object-contain"
                      draggable={false}
                      sizes="(max-width: 768px) 95vw, 680px"
                      priority={i < 3}
                      loading={i < 6 ? "eager" : "lazy"}
                    />
                  </div>
                );
              })}
            </HTMLFlipBook>
          ) : null}
        </div>

        {phase === "ready" || phase === "waiting" || phase === "localPdf" ? (
          <div className="mt-10 flex flex-col items-center gap-3 text-center font-[family-name:var(--font-sans)] text-sm text-[#5a5a5a]">
            {totalPdfPages > renderedPdfPages ? (
              <p>
                Aperçu de {renderedPdfPages} page{renderedPdfPages > 1 ? "s" : ""} PDF sur {totalPdfPages} —
                téléchargez le fichier pour la version complète.
              </p>
            ) : null}
            <Link
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-[#0a0a0a]/25 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[#0a0a0a] transition-colors hover:border-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white"
            >
              Télécharger le PDF
              <span aria-hidden>↓</span>
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
