"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

type PrepareOk = { mode: "local" } | { mode: "supabase"; bucket: string; path: string; token: string };

export function MediaKitPdfAdmin({ currentUrl }: { currentUrl: string | null }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (accepted.length === 0) return;
      const file = accepted[0];
      setUploading(true);
      try {
        const prepRes = await fetch("/api/admin/media-kit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action: "prepare", filename: file.name, size: file.size }),
        });
        const prep = (await prepRes.json()) as PrepareOk & { error?: string };
        if (!prepRes.ok) {
          toast.error(prep.error ?? "Préparation du téléversement impossible");
          return;
        }

        if (prep.mode === "local") {
          const fd = new FormData();
          fd.set("file", file);
          const res = await fetch("/api/admin/media-kit", { method: "POST", body: fd, credentials: "same-origin" });
          const data = (await res.json()) as { ok?: boolean; error?: string };
          if (!res.ok) {
            toast.error(data.error ?? "Échec du téléversement");
            return;
          }
          toast.success("Media kit uploadé.");
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
          let msg = upErr.message || "Échec de l’envoi vers Supabase";
          if (/does not exist|not found|no such bucket/i.test(msg)) {
            msg = `Bucket « ${prep.bucket} » introuvable sur Supabase.`;
          }
          toast.error(msg);
          return;
        }

        const commitRes = await fetch("/api/admin/media-kit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action: "commit", path: prep.path }),
        });
        const commit = (await commitRes.json()) as { ok?: boolean; error?: string };
        if (!commitRes.ok) {
          toast.error(commit.error ?? "Enregistrement impossible");
          return;
        }
        toast.success("Media kit publié.");
        router.refresh();
      } catch {
        toast.error("Erreur réseau");
      } finally {
        setUploading(false);
      }
    },
    [router],
  );

  const handleClear = useCallback(async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/admin/media-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "clear" }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Suppression impossible");
        return;
      }
      toast.success("Media kit retiré.");
      router.refresh();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setClearing(false);
    }
  }, [router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 40 * 1024 * 1024,
    maxFiles: 1,
    disabled: uploading || clearing,
  });

  return (
    <div className="mt-8 rounded-xl border border-stone-200 bg-white p-8">
      <p className="text-sm text-stone-600">Upload du PDF du media kit (stocké sur Supabase Storage).</p>

      {currentUrl ? (
        <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-stone-500">Fichier actif</p>
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block truncate text-sm text-stone-900 underline underline-offset-2"
          >
            {currentUrl}
          </a>
          <button
            type="button"
            onClick={() => void handleClear()}
            disabled={uploading || clearing}
            className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {clearing ? "Suppression..." : "Retirer le media kit"}
          </button>
        </div>
      ) : null}

      <div
        {...getRootProps()}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
          isDragActive ? "border-stone-500 bg-stone-50" : "border-stone-200 bg-stone-50/50 hover:border-stone-400"
        } ${uploading || clearing ? "pointer-events-none opacity-60" : ""}`}
      >
        <input {...getInputProps()} />
        <p className="text-sm font-medium text-stone-700">
          {uploading ? "Téléversement..." : "Déposez votre media kit PDF ou cliquez pour choisir"}
        </p>
        <p className="mt-1 text-xs text-stone-500">PDF uniquement - max 40 Mo</p>
      </div>
    </div>
  );
}
