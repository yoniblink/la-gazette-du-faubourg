"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FlipbookCatalogEntry } from "@/lib/flipbook-catalog";
import type { FlipbookRenderProgress } from "@/lib/flipbook-render-progress";
import { createClient } from "@/utils/supabase/client";

type PrepareOk = { mode: "local" } | { mode: "supabase"; bucket: string; path: string; token: string };

export function FlipbookPdfAdmin({
  catalog,
  currentPdfUrl,
  hasManifest,
}: {
  catalog: FlipbookCatalogEntry[];
  currentPdfUrl: string | null;
  hasManifest: boolean;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [waitingForManifest, setWaitingForManifest] = useState(false);
  const [renderProgress, setRenderProgress] = useState<FlipbookRenderProgress | null>(null);
  const [settingActiveUrl, setSettingActiveUrl] = useState<string | null>(null);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

  const showProgress = waitingForManifest;

  const catalogSorted = useMemo(() => {
    return [...catalog].sort((a, b) => {
      const aAct = Boolean(currentPdfUrl && a.pdfUrl === currentPdfUrl);
      const bAct = Boolean(currentPdfUrl && b.pdfUrl === currentPdfUrl);
      if (aAct !== bAct) return aAct ? -1 : 1;
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });
  }, [catalog, currentPdfUrl]);

  useEffect(() => {
    if (!waitingForManifest) {
      setRenderProgress(null);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const [rMan, rProg] = await Promise.all([
          fetch("/api/flipbook/manifest", { cache: "no-store" }),
          fetch("/api/admin/flipbook-render-progress", { cache: "no-store" }),
        ]);
        if (cancelled) return;

        if (rProg.ok) {
          const jProg = (await rProg.json()) as { progress?: FlipbookRenderProgress | null };
          const prog = jProg.progress ?? null;
          setRenderProgress(prog);
          if (prog?.phase === "error") {
            setWaitingForManifest(false);
            setRenderProgress(null);
            toast.error(prog.message);
            router.refresh();
            return;
          }
        }

        const jMan = (await rMan.json()) as { manifest?: { pageUrls?: string[] } | null };
        if (jMan.manifest?.pageUrls && jMan.manifest.pageUrls.length > 0) {
          setWaitingForManifest(false);
          setRenderProgress(null);
          toast.success("Pages du flipbook prêtes.");
          router.refresh();
        }
      } catch {
        /* ignorer une erreur de poll ponctuelle */
      }
    };
    void poll();
    const t = window.setInterval(() => void poll(), 800);
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setWaitingForManifest(false);
        setRenderProgress(null);
        toast.error(
          "Délai dépassé : la génération est peut‑être encore en cours. Vérifiez l’accueil ou téléversez à nouveau le PDF.",
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

  const handleSetActive = useCallback(
    async (pdfUrl: string) => {
      setSettingActiveUrl(pdfUrl);
      try {
        const res = await fetch("/api/admin/flipbook-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action: "setActive", pdfUrl }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok) {
          toast.error(typeof data.error === "string" ? data.error : "Impossible de mettre à jour l’affichage");
          return;
        }
        toast.success("Ce magazine sera affiché sur l’accueil.");
        router.refresh();
      } catch {
        toast.error("Erreur réseau");
      } finally {
        setSettingActiveUrl(null);
      }
    },
    [router],
  );

  const handleDelete = useCallback(
    async (entry: FlipbookCatalogEntry) => {
      const ok = window.confirm(
        `Supprimer définitivement ce flipbook ?\n\n${entry.label}\n\nLe PDF et les pages WebP associées seront supprimés du stockage.`,
      );
      if (!ok) return;
      setDeletingUrl(entry.pdfUrl);
      try {
        const res = await fetch("/api/admin/flipbook-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action: "delete", pdfUrl: entry.pdfUrl }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok) {
          toast.error(typeof data.error === "string" ? data.error : "Suppression impossible");
          return;
        }
        toast.success("Flipbook supprimé.");
        router.refresh();
      } catch {
        toast.error("Erreur réseau");
      } finally {
        setDeletingUrl(null);
      }
    },
    [router],
  );

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
    <div className="mt-8 rounded-xl border border-stone-200 bg-white p-8">
      <h2 className="font-[family-name:var(--font-serif)] text-xl font-light text-stone-900">Magazine 3D</h2>
      <p className="mt-2 text-sm text-stone-500">
        Téléversez un PDF : il sera affiché comme magazine feuilletable au-dessus de la section newsletter. Plusieurs
        fichiers peuvent être enregistrés ; choisissez celui affiché sur l’accueil ci-dessous.
      </p>

      {catalogSorted.length > 0 ? (
        <div className="mt-8 border-t border-stone-100 pt-8">
          <h3 className="text-xs font-medium uppercase tracking-wider text-stone-500">Magazines enregistrés</h3>
          <ul className="mt-4 space-y-3">
            {catalogSorted.map((entry) => {
              const isActive = entry.pdfUrl === currentPdfUrl;
              const hasPages = Boolean(entry.manifestJson?.trim());
              return (
                <li
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-stone-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-stone-900">{entry.label}</p>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-stone-400" title={entry.pdfUrl}>
                      {entry.pdfUrl}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {isActive ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-900">
                          Sur l&apos;accueil
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                          hasPages ? "bg-stone-200 text-stone-800" : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {hasPages ? "Pages générées" : "Pages non générées"}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!isActive ? (
                      <button
                        type="button"
                        disabled={
                          settingActiveUrl !== null ||
                          deletingUrl !== null ||
                          uploading ||
                          waitingForManifest
                        }
                        onClick={() => void handleSetActive(entry.pdfUrl)}
                        className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
                      >
                        {settingActiveUrl === entry.pdfUrl ? "…" : "Afficher sur l’accueil"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={
                        deletingUrl !== null ||
                        settingActiveUrl !== null ||
                        uploading ||
                        waitingForManifest
                      }
                      onClick={() => void handleDelete(entry)}
                      className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                    >
                      {deletingUrl === entry.pdfUrl ? "Suppression…" : "Supprimer"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <AnimatePresence>
        {showProgress ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mt-5 overflow-hidden rounded-xl border border-stone-300/80 bg-gradient-to-b from-stone-50 to-stone-100/90 px-4 py-4 shadow-sm"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-600">
                Génération du flipbook
              </p>
              <p className="font-mono text-xs tabular-nums text-stone-700">
                {renderProgress?.percent ?? 0} %
              </p>
            </div>
            <div className="relative mt-3 h-3 w-full overflow-hidden rounded-full bg-stone-200/90">
              <div
                className="h-full rounded-full bg-stone-800 transition-[width] duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, renderProgress?.percent ?? 0))}%` }}
              />
            </div>
            <p className="mt-3 min-h-[3rem] text-sm leading-snug text-stone-800">
              {renderProgress?.message ??
                "Connexion au serveur… Le rendu démarre (iLovePDF puis conversion WebP page par page)."}
            </p>
            {renderProgress?.uploadCurrent != null && renderProgress.uploadsTotal != null ? (
              <p className="mt-1 text-xs text-stone-600">
                Fichiers WebP envoyés sur Supabase : {renderProgress.uploadCurrent} /{" "}
                {renderProgress.uploadsTotal}
              </p>
            ) : null}
            {renderProgress?.pdfPageCurrent != null && renderProgress.pdfPagesTotal != null ? (
              <p className="mt-0.5 text-xs text-stone-500">
                Progression pages PDF : {renderProgress.pdfPageCurrent} / {renderProgress.pdfPagesTotal}
              </p>
            ) : null}
            <p className="mt-3 text-[11px] text-stone-500">
              Ne fermez pas cet onglet pendant l’opération (peut prendre une à plusieurs minutes). La barre reflète
              l’état réel côté serveur.
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {currentPdfUrl && !hasManifest ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          Aucune image WebP enregistrée pour le flipbook (dossier <code className="font-mono">slots/</code> absent ou
          génération non terminée). Téléversez à nouveau le PDF pour relancer la création des pages.
        </p>
      ) : currentPdfUrl ? null : (
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
