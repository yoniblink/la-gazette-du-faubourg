"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

function formatTime(s: number): string {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

type Props = {
  videoFile: File;
  posterFile: File | null;
  onPosterCaptured: (file: File) => void;
  onClearPoster: () => void;
  disabled?: boolean;
};

export function InstagramReelPosterPicker({
  videoFile,
  posterFile,
  onPosterCaptured,
  onClearPoster,
  disabled,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);

  const [duration, setDuration] = useState(0);
  const [scrubTime, setScrubTime] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [metaReady, setMetaReady] = useState(false);

  useEffect(() => {
    if (!posterFile) {
      setPosterPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(posterFile);
    setPosterPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [posterFile]);

  useLayoutEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const url = URL.createObjectURL(videoFile);
    objectUrlRef.current = url;
    v.src = url;
    v.load();
    setMetaReady(false);
    setDuration(0);
    setScrubTime(0);

    const onLoaded = () => {
      setDuration(v.duration || 0);
      setScrubTime(0);
      v.currentTime = 0;
      setMetaReady(true);
    };

    v.addEventListener("loadedmetadata", onLoaded);

    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeAttribute("src");
      v.load();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [videoFile]);

  const syncVideoToScrub = useCallback(
    (t: number) => {
      const v = videoRef.current;
      if (!v || !metaReady) return;
      v.pause();
      const next = Math.max(0, Math.min(t, duration || v.duration || 0));
      setScrubTime(next);
      v.currentTime = next;
    },
    [duration, metaReady],
  );

  const captureFrame = useCallback(async () => {
    const v = videoRef.current;
    if (!v || disabled || !metaReady) return;
    if (!v.videoWidth || !v.videoHeight) {
      return;
    }
    setCapturing(true);
    try {
      const target = Math.max(0, Math.min(scrubTime, duration || v.duration || 0));
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          v.removeEventListener("seeked", onSeeked);
          resolve();
        };
        v.addEventListener("seeked", onSeeked);
        v.pause();
        v.currentTime = target;
        window.setTimeout(() => {
          v.removeEventListener("seeked", onSeeked);
          resolve();
        }, 300);
      });

      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(v, 0, 0);
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob((b) => res(b), "image/jpeg", 0.92),
      );
      if (!blob) return;
      const file = new File([blob], `poster-${Date.now()}.jpg`, { type: "image/jpeg" });
      onPosterCaptured(file);
    } finally {
      setCapturing(false);
    }
  }, [disabled, duration, metaReady, onPosterCaptured, scrubTime]);

  return (
    <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50/80 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-stone-600">Image d’aperçu depuis la vidéo</p>
      <p className="mt-1 text-xs text-stone-500">
        Faites défiler la ligne de temps, puis capturez la frame affichée.
      </p>

      <div className="mt-4 space-y-3">
        <div className="relative mx-auto max-h-[min(420px,55vh)] w-full max-w-[220px] overflow-hidden rounded-lg bg-black shadow-inner">
          <video
            ref={videoRef}
            muted
            playsInline
            preload="metadata"
            title="Lecture ou pause"
            className="h-full w-full cursor-pointer object-contain"
            onTimeUpdate={(e) => setScrubTime(e.currentTarget.currentTime)}
            onClick={() => {
              const el = videoRef.current;
              if (!el) return;
              if (el.paused) void el.play();
              else el.pause();
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-stone-500">
          <span>{formatTime(scrubTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.04}
          value={Math.min(scrubTime, duration || 0)}
          onChange={(e) => syncVideoToScrub(Number(e.target.value))}
          disabled={disabled || !metaReady || !duration}
          className="w-full accent-stone-800 disabled:opacity-40"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void captureFrame()}
            disabled={disabled || !metaReady || capturing}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-800 transition-colors hover:bg-stone-100 disabled:opacity-40"
          >
            {capturing ? "Capture…" : "Utiliser cette image comme aperçu"}
          </button>
          {posterFile ? (
            <button
              type="button"
              onClick={onClearPoster}
              disabled={disabled}
              className="text-xs text-stone-500 underline hover:text-stone-800 disabled:opacity-40"
            >
              Retirer l’aperçu
            </button>
          ) : null}
        </div>

        {posterFile && posterPreviewUrl ? (
          <div className="flex items-center gap-3 rounded-md border border-stone-200 bg-white p-2">
            <p className="min-w-0 flex-1 truncate text-xs text-stone-600">{posterFile.name}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={posterPreviewUrl} alt="" className="h-14 w-10 shrink-0 rounded object-cover" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
