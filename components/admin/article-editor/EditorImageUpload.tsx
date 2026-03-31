"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { uploadAdminImageFile } from "@/lib/admin-upload-image";

export function EditorImageUpload({
  onUploaded,
  label = "Glisser-déposer ou cliquer",
  className = "",
  variant = "light",
}: {
  onUploaded: (url: string) => void;
  label?: string;
  className?: string;
  variant?: "light" | "dark";
}) {
  const [uploading, setUploading] = useState(false);

  const uploadOne = useCallback(
    async (file: File) => {
      const result = await uploadAdminImageFile(file);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onUploaded(result.url);
      toast.success("Image ajoutée.");
    },
    [onUploaded],
  );

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (accepted.length === 0 || uploading) return;
      setUploading(true);
      for (const file of accepted) {
        try {
          await uploadOne(file);
        } catch {
          toast.error("Erreur réseau");
        }
      }
      setUploading(false);
    },
    [uploadOne, uploading],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [], "image/gif": [] },
    maxSize: 8 * 1024 * 1024,
    disabled: uploading,
    multiple: false,
  });

  const dark = variant === "dark";
  const box = dark
    ? isDragActive
      ? "border-rose-500/50 bg-zinc-800"
      : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-800/50"
    : isDragActive
      ? "border-stone-500 bg-stone-100"
      : "border-stone-200 bg-stone-50/80 hover:border-stone-300 hover:bg-stone-50";

  return (
    <div
      {...getRootProps()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-3 py-6 text-center transition-colors ${box} ${
        uploading ? "pointer-events-none opacity-60" : ""
      } ${className}`}
    >
      <input {...getInputProps()} />
      <p
        className={`text-[11px] font-medium uppercase tracking-wider ${
          dark ? "text-zinc-300" : "text-stone-600"
        }`}
      >
        {uploading ? "Envoi…" : isDragActive ? "Déposez ici" : label}
      </p>
      <p className={`mt-1 text-[10px] ${dark ? "text-zinc-500" : "text-stone-500"}`}>JPEG, PNG, WebP, GIF · max 8 Mo</p>
    </div>
  );
}
