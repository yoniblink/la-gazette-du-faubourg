"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

type PrepareOk = { mode: "local" } | { mode: "supabase"; bucket: string; path: string; token: string };

const STEPS_REGENERATE = [
  "Connexion à iLovePDF…",
  "Conversion du PDF en images…",
  "Téléchargement et découpe des pages…",
  "Envoi des images WebP vers le stockage…",
];

const STEPS_WAIT_MANIFEST = [
  "Génération côté serveur en cours…",
  "Encore un instant…",
  "Finalisation des images sur Supabase…",
  "Préparation du manifeste du flipbook…",
];

export function FlipbookPdfAdmin({
  currentPdfUrl,
  hasManifest,
  maxPagesInFlipbook,
}: {
  currentPdfUrl: string | null;
  hasManifest: boolean;
  /** Nombre max de pages PDF exportées (info affichée). */
  maxPagesInFlipbook: number;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [renderingPages, setRenderingPages] = useState(false);
  const [waitingForManifest, setWaitingForManifest] = useState(false);
  const [progressStep, setProgressStep] = useState(0);

  const showProgress = renderingPages || waitingForManifest;
  const stepLabels = waitingForManifest ? STEPS_WAIT_MANIFEST : STEPS_REGENERATE;

  useEffect(() => {
    if (!showProgress) {
      setProgressStep(0);
      return;
    }
    const id = window.setInterval(() => {
      setProgressStep((s) => (s + 1) % stepLabels.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [showProgress, stepLabels.length]);

  useEffect(() => {
    if (!waitingForManifest) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch("/api/flipbook/manifest", { cache: "no-store" });
        const j = (await r.json()) as { manifest?: { pageUrls?: string[] } | null };
        if (cancelled) return;
        if (j.manifest?.pageUrls && j.manifest.pageUrls.length > 0) {
          setWaitingForManifest(false);
          toast.success("Pages du flipbook prêtes.");
          router.refresh();
        }
      } catch {
        /* ignorer une erreur de poll ponctuelle */
      }
    };
    void poll();
    const t = window.setInterval(() => void poll(), 2000);
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setWaitingForManifest(false);
        toast.error(
          "Délai dépassé : la génération est peut‑être encore en cours. Vérifiez l’accueil ou relancez « Générer les pages ».",
          { duration: 8000 },
        );
      }
    }, 240_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
      window.clearTimeout(timeout);
    };
  }, [waitingForManifest, router]);

  const canRegeneratePages = Boolean(currentPdfUrl?.startsWith("https://"));

  const onRegeneratePages = useCallback(async () => {
    if (!canRegeneratePages) return;
    setRenderingPages(true);
    try {
      const res = await fetch("/api/admin/flipbook-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "renderPages" }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Impossible de générer les pages");
        return;
      }
      toast.success("Pages WebP générées. Vérifiez le dossier slots/ dans Supabase et l’accueil.");
      router.refresh();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setRenderingPages(false);
    }
  }, [canRegeneratePages, router]);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (accepted.length === 0) return;
      const file = accepted[0];
      setUploading(true);
      try {
        const prepRes = await fetch("/api/admin/flipbook-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            action: "prepare",
            filename: file.name,
            size: file.size,
          }),
        });
        const prep = (await prepRes.json()) as PrepareOk & { error?: string };

        if (!prepRes.ok) {
          toast.error(
            typeof prep.error === "string" ? prep.error : "Préparation du téléversement impossible",
          );
          return;
        }

        if (prep.mode === "local") {
          const fd = new FormData();
          fd.set("file", file);
          const res = await fetch("/api/admin/flipbook-pdf", {
            method: "POST",
            body: fd,
            credentials: "same-origin",
          });
          const data = (await res.json()) as { ok?: boolean; error?: string; url?: string };
          if (!res.ok) {
            toast.error(data.error ?? "Échec du téléversement");
            return;
          }
          toast.success("PDF du flipbook mis à jour.");
          router.refresh();
          return;
        }

        const supabase = createClient();
        const { error: upErr } = await supabase.storage
          .from(prep.bucket)
          .uploadToSignedUrl(prep.path, prep.token, file, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (upErr) {
          let msg = upErr.message || "Échec de l’envoi vers le stockage";
          if (/does not exist|not found|no such bucket/i.test(msg)) {
            msg =
              `Bucket « ${prep.bucket} » introuvable sur Supabase (créez-le dans Storage, nom identique, bucket public).`;
          }
          toast.error(msg);
          return;
        }

        const commitRes = await fetch("/api/admin/flipbook-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action: "commit", path: prep.path }),
        });
        const commit = (await commitRes.json()) as {
          ok?: boolean;
          error?: string;
          renderingScheduled?: boolean;
        };
        if (!commitRes.ok) {
          toast.error(commit.error ?? "Enregistrement de l’URL impossible");
          return;
        }
        toast.success(
          commit.renderingScheduled
            ? "PDF enregistré. Génération des pages en arrière-plan…"
            : "PDF du flipbook mis à jour.",
        );
        if (commit.renderingScheduled) {
          setWaitingForManifest(true);
        }
        router.refresh();
      } catch {
        toast.error("Erreur réseau");
      } finally {
        setUploading(false);
      }
    },
    [router],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 40 * 1024 * 1024,
    maxFiles: 1,
    disabled: uploading || waitingForManifest,
  });

  return (
    <div className="mt-10 rounded-xl border border-stone-200 bg-white p-8">
      <h2 className="font-[family-name:var(--font-serif)] text-xl font-light text-stone-900">
        Flipbook (page d’accueil)
      </h2>
      <p className="mt-2 text-sm text-stone-500">
        Téléversez un PDF : il sera affiché comme magazine feuilletable au-dessus de la section
        newsletter. Sur Vercel, le fichier est envoyé directement vers Supabase Storage (contourne la
        limite ~4,5 Mo du serveur). Jusqu’à{" "}
        <span className="font-medium text-stone-700">{maxPagesInFlipbook}</span> page
        {maxPagesInFlipbook > 1 ? "s" : ""} sont générées (
        <code className="rounded bg-stone-100 px-1 font-mono text-[11px]">FLIPBOOK_RENDER_MAX_PAGES</code>
        ).
      </p>

      <AnimatePresence>
        {showProgress ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mt-5 overflow-hidden rounded-xl border border-stone-300/80 bg-gradient-to-b from-stone-50 to-stone-100/90 px-4 py-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-600">
              Génération du flipbook
            </p>
            <div className="relative mt-3 h-2.5 w-full overflow-hidden rounded-full bg-stone-200/90">
              <motion.div
                className="absolute top-0 h-full w-[38%] rounded-full bg-stone-800"
                initial={{ left: "-38%" }}
                animate={{ left: ["-38%", "100%"] }}
                transition={{
                  duration: 1.45,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
            <motion.p
              key={progressStep}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              className="mt-3 min-h-[2.5rem] text-sm leading-snug text-stone-800"
            >
              {stepLabels[progressStep]}
            </motion.p>
            <p className="mt-1 text-[11px] text-stone-500">
              Ne fermez pas cet onglet pendant l’opération (peut prendre une à plusieurs minutes).
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {currentPdfUrl ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-stone-700">
            Fichier actif :{" "}
            <Link
              href={currentPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all font-mono text-xs text-stone-900 underline"
            >
              {currentPdfUrl}
            </Link>
          </p>
          {!hasManifest && canRegeneratePages ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
              Aucune image WebP enregistrée pour le flipbook (dossier <code className="font-mono">slots/</code> absent
              ou génération non terminée). Utilisez le bouton ci-dessous pour relancer la création des pages à partir de
              ce PDF.
            </p>
          ) : null}
          {canRegeneratePages ? (
            <button
              type="button"
              onClick={() => void onRegeneratePages()}
              disabled={renderingPages || uploading || waitingForManifest}
              className="rounded-lg border border-stone-300 bg-stone-50 px-4 py-2 text-xs font-medium uppercase tracking-wider text-stone-800 transition-colors hover:bg-stone-100 disabled:opacity-50"
            >
              {renderingPages
                ? "Génération en cours…"
                : hasManifest
                  ? "Régénérer les images WebP"
                  : "Générer les pages WebP (flipbook)"}
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-amber-800">Aucun PDF — la section flipbook est masquée sur le site.</p>
      )}

      <div
        {...getRootProps()}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
          isDragActive ? "border-stone-500 bg-stone-50" : "border-stone-200 bg-stone-50/50 hover:border-stone-400"
        } ${uploading || waitingForManifest ? "pointer-events-none opacity-60" : ""}`}
      >
        <input {...getInputProps()} />
        <p className="text-sm font-medium text-stone-700">
          {uploading ? "Téléversement…" : "Déposez un PDF ou cliquez pour choisir"}
        </p>
        <p className="mt-1 text-xs text-stone-500">PDF uniquement — max 40 Mo</p>
      </div>
    </div>
  );
}
