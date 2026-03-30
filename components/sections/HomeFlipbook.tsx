"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HomeFlipbookViewer } from "@/components/flipbook/HomeFlipbookViewer";
import type { FlipbookManifest } from "@/lib/flipbook-manifest";
import { MotionDiv } from "@/components/motion-prefers";
import { fadeUp } from "@/lib/motion";

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
    pageW = 480,
    pageH = 672,
    totalPdfPages = 0,
    renderedPdfPages = 0,
  } = manifest ?? {};
  const flipbookInstanceKey = pageUrls.length ? pageUrls.join("\u0000") : "empty";

  return (
    <section
      id="flipbook"
      className="scroll-mt-24 border-y border-black/[0.06] bg-[radial-gradient(ellipse_120%_85%_at_50%_18%,#fcfcfb_0%,#f6f3ee_45%,#ece8e2_100%)] py-20 md:py-28"
    >
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
