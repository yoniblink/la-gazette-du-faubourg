"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { MediaCardItem } from "@/components/admin/MediaCard";

function displayUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (typeof window === "undefined") return url;
  return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

function isVideoMime(mime: string | null | undefined): boolean {
  return Boolean(mime && mime.startsWith("video/"));
}

export function MediaLibraryPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (url: string, alt: string | null) => void;
}) {
  const [items, setItems] = useState<MediaCardItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/media", { credentials: "same-origin" });
    const data = (await res.json()) as { items?: MediaCardItem[]; error?: string };
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Chargement impossible");
      setItems([]);
      return;
    }
    setItems(Array.isArray(data.items) ? data.items : []);
  }, []);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      void load();
    });
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label="Fermer la médiathèque"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[min(85dvh,720px)] w-full max-w-3xl flex-col rounded-t-2xl border border-stone-200 bg-white shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-picker-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-4 py-3 sm:px-5">
          <h2 id="media-picker-title" className="font-[family-name:var(--font-serif)] text-base font-light text-stone-900">
            Médiathèque
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
            aria-label="Fermer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {error ? (
            <p className="py-8 text-center text-sm text-red-600">{error}</p>
          ) : items === null ? (
            <p className="py-12 text-center text-sm text-stone-500">Chargement…</p>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-stone-600">Aucun média pour le moment.</p>
              <p className="mt-2 text-xs text-stone-500">
                Téléversez des médias depuis{" "}
                <Link
                  href="/admin/media"
                  className="font-medium text-rose-700 underline-offset-2 hover:underline"
                >
                  Administration → Médias
                </Link>
                .
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(m.url, m.alt);
                      onClose();
                    }}
                    className="group w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-50 text-left shadow-sm transition-[border-color,box-shadow] hover:border-rose-300 hover:shadow-md"
                  >
                    <div className="relative aspect-square bg-stone-100">
                      {isVideoMime(m.mimeType) ? (
                        <video
                          src={displayUrl(m.url)}
                          className="absolute inset-0 h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                          aria-label={m.alt ?? m.filename}
                        />
                      ) : (
                        <Image
                          src={displayUrl(m.url)}
                          alt={m.alt ?? m.filename}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover"
                          unoptimized
                        />
                      )}
                    </div>
                    <p className="truncate px-2 py-2 font-mono text-[9px] text-stone-500" title={m.filename}>
                      {m.filename}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="shrink-0 border-t border-stone-100 px-4 py-3 text-center sm:px-5">
          <Link
            href="/admin/media"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-medium uppercase tracking-wider text-stone-500 hover:text-stone-800"
          >
            Ouvrir la page Médias dans un nouvel onglet
          </Link>
        </div>
      </div>
    </div>
  );
}
