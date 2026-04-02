"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 120 * 1024 * 1024;

function clientMime(file: File): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const n = file.name.toLowerCase();
  if (n.endsWith(".mp4")) return "video/mp4";
  if (n.endsWith(".webm")) return "video/webm";
  if (n.endsWith(".mov")) return "video/quicktime";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  return file.type || "image/jpeg";
}

function isVideoMime(mime: string): boolean {
  return mime.startsWith("video/");
}

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
              contentType: clientMime(file),
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
            toast.success(isVideoMime(clientMime(file)) ? "Vidéo ajoutée." : "Image ajoutée.");
            continue;
          }

          const supabase = createClient();
          const mime = clientMime(file);
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

          toast.success(isVideoMime(mime) ? "Vidéo ajoutée." : "Image ajoutée.");
        } catch {
          toast.error("Erreur réseau");
        }
      }
      setUploading(false);
      router.refresh();
    },
    [router],
  );

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    for (const r of rejections) {
      const msg = r.errors.map((e) => e.message).join(" — ") || "Fichier refusé";
      toast.error(msg);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "image/gif": [],
      "video/mp4": [],
      "video/webm": [],
      "video/quicktime": [],
    },
    maxSize: MAX_VIDEO_BYTES,
    validator: (file) => {
      const mime = clientMime(file);
      const isImg = mime.startsWith("image/");
      const isVid = mime.startsWith("video/");
      if (!isImg && !isVid) {
        return { code: "file-invalid-type", message: "Type non autorisé (images ou vidéo MP4, WebM, MOV)" };
      }
      const limit = isVid ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (file.size > limit) {
        return {
          code: "file-too-large",
          message: isVid ? "Vidéo trop volumineuse (max 120 Mo)" : "Image trop volumineuse (max 8 Mo)",
        };
      }
      return null;
    },
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
        {isDragActive
          ? "Déposez les fichiers ici"
          : "Glissez-déposez des images ou vidéos, ou cliquez pour choisir"}
      </p>
      <p className="mt-2 text-xs text-stone-500">
        Images : JPEG, PNG, WebP, GIF — max 8 Mo · Vidéos : MP4, WebM, MOV — max 120 Mo
      </p>
    </div>
  );
}
