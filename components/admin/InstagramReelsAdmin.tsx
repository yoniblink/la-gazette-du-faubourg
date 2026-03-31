"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import {
  deleteInstagramReel,
  moveInstagramReel,
  updateInstagramReelCaption,
} from "@/app/admin/(panel)/instagram-reels/actions";
import { InstagramReelPosterPicker } from "@/components/admin/InstagramReelPosterPicker";

type ReelRow = {
  id: string;
  videoUrl: string;
  posterUrl: string | null;
  caption: string | null;
  sortOrder: number;
};

type PrepareOk = { mode: "supabase"; bucket: string; path: string; token: string };

export function InstagramReelsAdmin({
  initialReels,
  storageConfigured,
}: {
  initialReels: ReelRow[];
  storageConfigured: boolean;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);

  const onDropVideo = useCallback((accepted: File[]) => {
    if (accepted[0]) setVideoFile(accepted[0]);
  }, []);

  const onDropPoster = useCallback((accepted: File[]) => {
    if (accepted[0]) setPosterFile(accepted[0]);
  }, []);

  useEffect(() => {
    setPosterFile(null);
  }, [videoFile]);

  const videoDrop = useDropzone({
    onDrop: onDropVideo,
    accept: { "video/mp4": [".mp4"], "video/webm": [".webm"], "video/quicktime": [".mov"] },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024,
    disabled: uploading || !storageConfigured,
  });

  const posterDrop = useDropzone({
    onDrop: onDropPoster,
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] },
    maxFiles: 1,
    maxSize: 8 * 1024 * 1024,
    disabled: uploading || !storageConfigured,
  });

  const uploadToSignedUrl = async (prep: PrepareOk, file: File, contentType: string) => {
    const supabase = createClient();
    const { error } = await supabase.storage.from(prep.bucket).uploadToSignedUrl(prep.path, prep.token, file, {
      contentType,
      upsert: true,
    });
    if (error) throw new Error(error.message);
  };

  const handleAddReel = async () => {
    if (!videoFile) {
      toast.error("Choisissez une vidéo.");
      return;
    }
    if (!storageConfigured) return;
    setUploading(true);
    try {
      const prepVRes = await fetch("/api/admin/instagram-reels-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "prepare",
          filename: videoFile.name,
          size: videoFile.size,
          kind: "video",
        }),
      });
      const prepV = (await prepVRes.json()) as PrepareOk & { error?: string };
      if (!prepVRes.ok) {
        toast.error(prepV.error ?? "Préparation vidéo impossible");
        return;
      }
      const ct = videoFile.type || "video/mp4";
      await uploadToSignedUrl(prepV, videoFile, ct);

      let posterPath: string | null = null;
      if (posterFile) {
        const prepPRes = await fetch("/api/admin/instagram-reels-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            action: "prepare",
            filename: posterFile.name,
            size: posterFile.size,
            kind: "poster",
          }),
        });
        const prepP = (await prepPRes.json()) as PrepareOk & { error?: string };
        if (!prepPRes.ok) {
          toast.error(prepP.error ?? "Préparation de l’aperçu impossible");
          return;
        }
        const pct = posterFile.type || "image/jpeg";
        await uploadToSignedUrl(prepP, posterFile, pct);
        posterPath = prepP.path;
      }

      const commitRes = await fetch("/api/admin/instagram-reels-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "commit",
          videoPath: prepV.path,
          posterPath,
          caption: captionDraft.trim() || undefined,
        }),
      });
      const commit = (await commitRes.json()) as { ok?: boolean; error?: string };
      if (!commitRes.ok) {
        toast.error(commit.error ?? "Enregistrement impossible");
        return;
      }
      toast.success("Vidéo ajoutée.");
      setVideoFile(null);
      setPosterFile(null);
      setCaptionDraft("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette vidéo ?")) return;
    const r = await deleteInstagramReel(id);
    if (!r.ok) {
      toast.error("Suppression impossible");
      return;
    }
    toast.success("Vidéo supprimée.");
    router.refresh();
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    await moveInstagramReel(id, direction);
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl font-light text-stone-900">
        Instagram — Reels
      </h1>
      <p className="mt-2 text-sm text-stone-500">
        Ajoutez des vidéos verticales (type Reels) : elles seront affichées dans la section « Retrouvez-nous sur Instagram »
        sur l’accueil.
      </p>

      {!storageConfigured ? (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          Configurez <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> et exécutez{" "}
          <code className="font-mono text-xs">supabase/storage-instagram-reels-setup.sql</code> pour créer le bucket{" "}
          <code className="font-mono text-xs">instagram-reels</code>.
        </p>
      ) : null}

      <div className="mt-10 rounded-xl border border-stone-200 bg-white p-6 md:p-8">
        <h2 className="font-[family-name:var(--font-serif)] text-lg font-light text-stone-900">Nouvelle vidéo</h2>
        <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-stone-500">
          Légende (optionnel)
        </label>
        <textarea
          value={captionDraft}
          onChange={(e) => setCaptionDraft(e.target.value)}
          rows={2}
          maxLength={280}
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-400"
          placeholder="Texte affiché sous la vidéo sur le site"
          disabled={uploading || !storageConfigured}
        />

        <div className="mt-4 grid gap-4 md:grid-cols-2 md:items-stretch">
          <div className="flex min-h-0 flex-col md:h-full">
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Vidéo *</p>
            <div
              {...videoDrop.getRootProps()}
              className={`mt-2 flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
                videoDrop.isDragActive ? "border-stone-500 bg-stone-50" : "border-stone-200 bg-stone-50/50"
              } ${uploading || !storageConfigured ? "pointer-events-none opacity-50" : ""}`}
            >
              <input {...videoDrop.getInputProps()} />
              <p className="text-center text-sm text-stone-700">
                {videoFile ? videoFile.name : "MP4, WebM ou MOV — max 100 Mo"}
              </p>
            </div>
          </div>
          <div className="flex min-h-0 flex-col md:h-full">
            <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Aperçu fichier (optionnel)</p>
            <div
              {...posterDrop.getRootProps()}
              className={`mt-2 flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
                posterDrop.isDragActive ? "border-stone-500 bg-stone-50" : "border-stone-200 bg-stone-50/50"
              } ${uploading || !storageConfigured ? "pointer-events-none opacity-50" : ""}`}
            >
              <input {...posterDrop.getInputProps()} />
              <p className="max-w-[18rem] text-center text-[11px] leading-snug text-stone-400">
                Sinon, choisissez une frame dans le lecteur sous la vidéo.
              </p>
              <p className="text-center text-sm text-stone-700">
                {posterFile ? posterFile.name : "JPG, PNG ou WebP — max 8 Mo"}
              </p>
            </div>
          </div>
        </div>

        {videoFile ? (
          <InstagramReelPosterPicker
            videoFile={videoFile}
            posterFile={posterFile}
            onPosterCaptured={setPosterFile}
            onClearPoster={() => setPosterFile(null)}
            disabled={uploading || !storageConfigured}
          />
        ) : null}

        <button
          type="button"
          onClick={() => void handleAddReel()}
          disabled={uploading || !storageConfigured || !videoFile}
          className="mt-6 rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-40"
        >
          {uploading ? "Téléversement…" : "Enregistrer la vidéo"}
        </button>
      </div>

      <div className="mt-10 rounded-xl border border-stone-200 bg-white p-6 md:p-8">
        <h2 className="font-[family-name:var(--font-serif)] text-lg font-light text-stone-900">Vidéos publiées</h2>
        {initialReels.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">Aucune vidéo pour l’instant.</p>
        ) : (
          <ul className="mt-6 space-y-6">
            {initialReels.map((reel, idx) => (
              <li
                key={reel.id}
                className="flex flex-col gap-4 border-b border-stone-100 pb-6 last:border-b-0 last:pb-0 md:flex-row md:items-start"
              >
                <div className="relative h-40 w-24 shrink-0 overflow-hidden rounded-lg bg-stone-200">
                  <video
                    src={reel.videoUrl}
                    poster={reel.posterUrl ?? undefined}
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <CaptionEditor
                    reelId={reel.id}
                    initialCaption={reel.caption ?? ""}
                    onSaved={() => router.refresh()}
                  />
                  <p className="mt-1 truncate font-mono text-[11px] text-stone-400">{reel.videoUrl}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleMove(reel.id, "up")}
                      disabled={idx === 0}
                      className="rounded border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:bg-stone-50 disabled:opacity-30"
                    >
                      Monter
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleMove(reel.id, "down")}
                      disabled={idx === initialReels.length - 1}
                      className="rounded border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:bg-stone-50 disabled:opacity-30"
                    >
                      Descendre
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(reel.id)}
                      className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CaptionEditor({
  reelId,
  initialCaption,
  onSaved,
}: {
  reelId: string;
  initialCaption: string;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(initialCaption);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(initialCaption);
  }, [initialCaption]);

  const save = async () => {
    setSaving(true);
    try {
      await updateInstagramReelCaption(reelId, value);
      toast.success("Légende enregistrée.");
      onSaved();
    } catch {
      toast.error("Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wider text-stone-500">Légende</label>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={280}
          className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-400"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || value === initialCaption}
          className="shrink-0 rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-40"
        >
          {saving ? "…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
