"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

type PrepareOk = { mode: "local" } | { mode: "supabase"; bucket: string; path: string; token: string };

export function FlipbookPdfAdmin({ currentPdfUrl }: { currentPdfUrl: string | null }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

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
          toast.error(upErr.message || "Échec de l’envoi vers le stockage");
          return;
        }

        const commitRes = await fetch("/api/admin/flipbook-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action: "commit", path: prep.path }),
        });
        const commit = (await commitRes.json()) as { ok?: boolean; error?: string };
        if (!commitRes.ok) {
          toast.error(commit.error ?? "Enregistrement de l’URL impossible");
          return;
        }
        toast.success("PDF du flipbook mis à jour.");
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
    disabled: uploading,
  });

  return (
    <div className="mt-10 rounded-xl border border-stone-200 bg-white p-8">
      <h2 className="font-[family-name:var(--font-serif)] text-xl font-light text-stone-900">
        Flipbook (page d’accueil)
      </h2>
      <p className="mt-2 text-sm text-stone-500">
        Téléversez un PDF : il sera affiché comme magazine feuilletable au-dessus de la section
        newsletter. Sur Vercel, le fichier est envoyé directement vers Supabase Storage (contourne la
        limite ~4,5 Mo du serveur).
      </p>

      {currentPdfUrl ? (
        <p className="mt-4 text-sm text-stone-700">
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
      ) : (
        <p className="mt-4 text-sm text-amber-800">Aucun PDF — la section flipbook est masquée sur le site.</p>
      )}

      <div
        {...getRootProps()}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
          isDragActive ? "border-stone-500 bg-stone-50" : "border-stone-200 bg-stone-50/50 hover:border-stone-400"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
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
