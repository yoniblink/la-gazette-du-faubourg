"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function MediaDropzone() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (accepted.length === 0) return;
      setUploading(true);
      for (const file of accepted) {
        const fd = new FormData();
        fd.set("file", file);
        try {
          const res = await fetch("/api/admin/upload", {
            method: "POST",
            body: fd,
            credentials: "same-origin",
          });
          const data = (await res.json()) as { ok?: boolean; error?: string; url?: string };
          if (!res.ok) {
            toast.error(data.error ?? "Échec du téléversement");
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
