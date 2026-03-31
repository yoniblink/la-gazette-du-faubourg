"use client";

import { createClient } from "@/utils/supabase/client";

type PrepareOk =
  | { mode: "local" }
  | { mode: "supabase"; bucket: string; path: string; token: string };

export type AdminUploadImageResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Téléverse une image via la même API que l’éditeur (stockage local ou Supabase). */
export async function uploadAdminImageFile(file: File): Promise<AdminUploadImageResult> {
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

  let prep: PrepareOk & { error?: string };
  try {
    prep = (await prepRes.json()) as PrepareOk & { error?: string };
  } catch {
    return { ok: false, error: "Réponse serveur invalide" };
  }

  if (!prepRes.ok) {
    return { ok: false, error: typeof prep.error === "string" ? prep.error : "Préparation impossible" };
  }

  if (prep.mode === "local") {
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: fd,
      credentials: "same-origin",
    });
    let data: { ok?: boolean; error?: string; url?: string };
    try {
      data = (await res.json()) as { ok?: boolean; error?: string; url?: string };
    } catch {
      return { ok: false, error: "Réponse serveur invalide" };
    }
    if (!res.ok || !data.url) {
      return { ok: false, error: data.error ?? "Téléversement échoué" };
    }
    return { ok: true, url: data.url };
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
    return { ok: false, error: upErr.message || "Échec du stockage" };
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

  let commit: { ok?: boolean; error?: string; url?: string };
  try {
    commit = (await commitRes.json()) as { ok?: boolean; error?: string; url?: string };
  } catch {
    return { ok: false, error: "Réponse invalide après envoi" };
  }

  if (!commitRes.ok || !commit.url) {
    return { ok: false, error: commit.error ?? "Enregistrement impossible" };
  }

  return { ok: true, url: commit.url };
}
