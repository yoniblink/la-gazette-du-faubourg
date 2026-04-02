"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import Image, { type ImageLoader } from "next/image";
import type { ArticleBlockImage } from "@/lib/article-blocks/types";
import { uploadAdminImageFile } from "@/lib/admin-upload-image";
import { SelectedBlockDelete } from "@/components/admin/article-editor/SelectedBlockDelete";
import { MediaLibraryPicker } from "@/components/admin/article-editor/MediaLibraryPicker";

const MIN_W = 25;
const MAX_W = 100;

export function ImageBlockPreview({
  block,
  selected,
  onSelect,
  onUpdate,
  onRemove,
}: {
  block: ArticleBlockImage;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (next: ArticleBlockImage) => void;
  onRemove: () => void;
}) {
  const passthroughLoader: ImageLoader = ({ src }) => src;
  const figureRef = useRef<HTMLElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const startResize = useCallback(
    (clientX: number, pointerId: number, target: HTMLElement) => {
      const fig = figureRef.current;
      if (!fig) return;
      const col = fig.closest(".article-tiptap-html");
      const parentW =
        col?.getBoundingClientRect().width ?? fig.parentElement?.getBoundingClientRect().width ?? 400;
      const startX = clientX;
      const startWp = block.widthPercent;

      target.setPointerCapture(pointerId);

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dw = (dx / parentW) * 100;
        const next = Math.min(MAX_W, Math.max(MIN_W, Math.round(startWp + dw)));
        onUpdate({ ...block, widthPercent: next });
      };
      const onUp = () => {
        try {
          target.releasePointerCapture(pointerId);
        } catch {
          /* ignore */
        }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [block, onUpdate],
  );

  const onHandlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    startResize(e.clientX, e.pointerId, e.currentTarget);
  };

  const onDropFiles = useCallback(
    async (accepted: File[]) => {
      if (accepted.length === 0 || uploading) return;
      const hadImage = Boolean(block.src.trim());
      setUploading(true);
      try {
        const result = await uploadAdminImageFile(accepted[0]!);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        onUpdate({ ...block, src: result.url });
        toast.success(hadImage ? "Image remplacée." : "Image ajoutée.");
      } catch {
        toast.error("Erreur réseau");
      } finally {
        setUploading(false);
      }
    },
    [block, onUpdate, uploading],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropFiles,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [], "image/gif": [] },
    maxSize: 8 * 1024 * 1024,
    disabled: uploading,
    multiple: false,
  });

  const figureChrome = selected
    ? "ring-2 ring-rose-500/45 ring-offset-2 ring-offset-[#fafafa]"
    : "hover:ring-1 hover:ring-zinc-300/70";

  const alignFlex =
    block.align === "left" ? "justify-start" : block.align === "right" ? "justify-end" : "justify-center";

  const show = block.src.trim();

  const emptyBox = isDragActive
    ? "border-rose-400/60 bg-rose-50/90"
    : "border-zinc-300/80 bg-zinc-100/90 hover:border-zinc-400 hover:bg-zinc-100";

  return (
    <div className="rounded-sm">
      <MediaLibraryPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(url, alt) => {
          const hadImage = Boolean(block.src.trim());
          onUpdate({ ...block, src: url, alt: alt?.trim() ? alt : block.alt });
          toast.success(hadImage ? "Image remplacée (médiathèque)." : "Image choisie dans la médiathèque.");
        }}
      />
      <div
        className={`flex w-full ${alignFlex}`}
        onMouseDown={(e) => {
          if (
            (e.target as HTMLElement).closest(
              "[data-image-resize-handle],[data-block-delete],[data-media-library-trigger]",
            )
          ) {
            return;
          }
          onSelect();
        }}
      >
        <figure
          ref={figureRef}
          className={`article-tiptap-figure relative m-0 rounded-[4px] transition-shadow ${figureChrome}`}
          style={{ width: `${block.widthPercent}%`, maxWidth: "100%" }}
        >
          {selected ? <SelectedBlockDelete onRemove={onRemove} label="Supprimer l’image" /> : null}
          {show ? (
            <div className="relative">
              <Image
                loader={passthroughLoader}
                unoptimized
                src={block.src.trim()}
                alt={block.alt || ""}
                width={1600}
                height={1200}
                className="block h-auto w-full max-w-full rounded-[4px]"
                draggable={false}
              />
              {selected ? (
                <div
                  {...getRootProps()}
                  data-image-replace-root
                  title="Cliquer ou glisser une image pour téléverser"
                  className={`group absolute inset-0 z-[1] flex cursor-pointer flex-col items-center justify-end rounded-[4px] pb-2.5 transition-colors duration-200 ${
                    isDragActive
                      ? "bg-rose-500/[0.14] ring-1 ring-inset ring-rose-400/50"
                      : "bg-black/0 hover:bg-black/[0.08]"
                  } ${uploading ? "pointer-events-none opacity-60" : ""}`}
                >
                  <input {...getInputProps()} />
                  {/* Dégradé discret au survol (repère sans masquer la photo) */}
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] rounded-b-[4px] bg-gradient-to-t from-black/25 via-black/10 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 max-sm:from-black/20 max-sm:via-black/5 max-sm:opacity-100"
                    aria-hidden
                  />
                  <div
                    className={`relative flex items-center gap-0.5 rounded-full border border-black/[0.06] bg-white/85 px-1 py-0.5 shadow-[0_1px_6px_rgba(0,0,0,0.08)] backdrop-blur-[6px] transition-[opacity,transform] duration-200 max-sm:translate-y-0 max-sm:opacity-100 sm:translate-y-0.5 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 ${isDragActive ? "translate-y-0 opacity-100" : ""}`}
                  >
                    <span className="max-w-[9.5rem] truncate px-2 py-1 font-[family-name:var(--font-sans)] text-[10px] font-medium text-zinc-600">
                      {uploading ? "Envoi…" : isDragActive ? "Déposer" : "Téléverser"}
                    </span>
                    <span className="h-3 w-px shrink-0 bg-zinc-300/80" aria-hidden />
                    <button
                      type="button"
                      data-media-library-trigger
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPickerOpen(true);
                      }}
                      className="pointer-events-auto shrink-0 rounded-full px-2 py-1 font-[family-name:var(--font-sans)] text-[10px] font-medium text-zinc-600 transition-colors hover:bg-zinc-900/[0.06] hover:text-zinc-900"
                    >
                      Médias
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div
              {...getRootProps()}
              data-image-empty-root
              className={`flex aspect-[16/10] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-[4px] border-2 border-dashed px-4 py-6 text-center transition-colors ${emptyBox} ${
                uploading ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <input {...getInputProps()} />
              <svg
                className="h-10 w-10 text-zinc-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <div className="space-y-1">
                <p className="font-[family-name:var(--font-sans)] text-xs font-medium text-zinc-700">
                  {uploading ? "Envoi…" : isDragActive ? "Déposez l’image ici" : "Glissez-déposez une image"}
                </p>
                <p className="font-[family-name:var(--font-sans)] text-[11px] leading-snug text-zinc-500">
                  {uploading ? "" : "ou cliquez pour choisir un fichier · JPEG, PNG, WebP, GIF · 8 Mo max"}
                </p>
              </div>
              <button
                type="button"
                data-media-library-trigger
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPickerOpen(true);
                }}
                className="rounded-lg border border-zinc-300/90 bg-white px-3 py-2 font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-wider text-zinc-600 shadow-sm transition-colors hover:border-rose-300 hover:bg-rose-50/80 hover:text-rose-800"
              >
                Médiathèque
              </button>
            </div>
          )}
          {block.caption.trim() ? (
            <figcaption className="article-tiptap-figcaption">{block.caption.trim()}</figcaption>
          ) : null}

          {selected && show ? (
            <>
              <button
                type="button"
                data-image-resize-handle
                onPointerDown={onHandlePointerDown}
                className="absolute bottom-0 right-0 z-[2] flex h-11 w-11 translate-x-[15%] translate-y-[15%] cursor-nwse-resize touch-none items-end justify-end p-1.5 text-left"
                aria-label="Redimensionner la largeur de l’image"
                title="Glisser pour changer la largeur"
              >
                <span className="pointer-events-none block h-3 w-3 shrink-0 rounded-[3px] border-2 border-white bg-rose-600 shadow-md" />
              </button>
            </>
          ) : null}
        </figure>
      </div>
    </div>
  );
}
