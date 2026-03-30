"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

type PrepareOk =
  | { mode: "local" }
  | { mode: "supabase"; bucket: string; path: string; token: string };

export function MediaDropzone() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (accepted.length === 0) return;
      setUploading(true);
      for (const file of accepted) {
        try {
          const prepRes = await fetch("/api/admin/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              action: "prepare",
              filename: file.name,
              contentType: file.type || "application/octet-stream",
              size: file.size,
            }),
          });

          const prep = (await prepRes.json()) as PrepareOk & { error?: string };

          if (!prepRes.ok) {
            toast.error(typeof prep.error === "string" ? prep.error : "Préparation du téléversement impossible");
            continue;
          }

          if (prep.mode === "local") {
            const fd = new FormData();
            fd.set("file", file);
            const res = await fetch("/api/admin/upload", {
              method: "POST",
              body: fd,
              credentials: "same-origin",
            });
            let data: { ok?: boolean; error?: string };
            try {
              data = (await res.json()) as { ok?: boolean; error?: string };
            } catch {
              toast.error(res.status >= 500 ? "Erreur serveur (téléversement)" : "Réponse invalide");
              continue;
            }
            if (!res.ok) {
              toast.error(data.error ?? "Échec du téléversement");
              continue;
            }
            toast.success("Image ajoutée.");
            continue;
          }

          const supabase = createClient();
          const mime = file.type && file.type !== "" ? file.type : "image/jpeg";
          const { error: upErr } = await supabase.storage
            .from(prep.bucket)
            .uploadToSignedUrl(prep.path, prep.token, file, {
              contentType: mime,
              upsert: true,
            });

          if (upErr) {
            let msg = upErr.message || "Échec de l’envoi vers le stockage";
            if (/does not exist|not found|no such bucket/i.test(msg)) {
              msg = `Bucket « ${prep.bucket} » introuvable sur Supabase (créez-le, nom identique, public).`;
            }
            toast.error(msg);
            continue;
          }

          const commitRes = await fetch("/api/admin/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              action: "commit",
              path: prep.path,
              filename: file.name,
              mimeType: mime,
            }),
          });

          let commit: { ok?: boolean; error?: string };
          try {
            commit = (await commitRes.json()) as { ok?: boolean; error?: string };
          } catch {
            toast.error("Réponse invalide après envoi");
            continue;
          }

          if (!commitRes.ok) {
            toast.error(commit.error ?? "Enregistrement impossible");
            continue;
          }

          toast.success("Image ajoutée.");
        } catch {
          toast.error("Erreur réseau");
        }
      }
      setUploading(false);
      router.refresh();
    },
    [router],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [], "image/gif": [] },
    maxSize: 8 * 1024 * 1024,
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 transition-colors ${
        isDragActive
          ? "border-stone-500 bg-stone-100"
          : "border-stone-200 bg-stone-50/50 hover:border-stone-300 hover:bg-stone-50"
      } ${uploading ? "pointer-events-none opacity-60" : ""}`}
    >
      <input {...getInputProps()} />
      <p className="text-sm font-medium text-stone-700">
        {isDragActive ? "Déposez les fichiers ici" : "Glissez-déposez des images, ou cliquez pour choisir"}
      </p>
      <p className="mt-2 text-xs text-stone-500">JPEG, PNG, WebP, GIF — max 8 Mo</p>
    </div>
  );
}
