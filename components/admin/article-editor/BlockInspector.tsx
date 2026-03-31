"use client";

import { useLayoutEffect, useRef } from "react";
import type { ArticleBlock } from "@/lib/article-blocks/types";
import { EditorImageUpload } from "@/components/admin/article-editor/EditorImageUpload";

function InlineHtmlField({
  html,
  blockId,
  onCommit,
  dark,
}: {
  html: string;
  blockId: string;
  onCommit: (next: string) => void;
  dark?: boolean;
}) {
  const r = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = r.current;
    if (!el || document.activeElement === el) return;
    const next = html.trim() ? html : "";
    if (el.innerHTML !== next) el.innerHTML = next || "<br>";
  }, [html, blockId]);

  return (
    <div
      ref={r}
      contentEditable
      suppressContentEditableWarning
      className={
        dark
          ? "min-h-[100px] w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm leading-relaxed text-zinc-100 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/30"
          : "min-h-[100px] w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm leading-relaxed text-stone-800 focus:border-stone-400 focus:outline-none"
      }
      onInput={() => {
        const focused = document.activeElement === r.current;
        if (!focused) return;
        onCommit(r.current?.innerHTML ?? "");
      }}
      onBlur={() => onCommit(r.current?.innerHTML ?? "")}
    />
  );
}

export function BlockInspector({
  block,
  onChange,
  theme = "light",
  embedded = false,
}: {
  block: ArticleBlock | null;
  onChange: (b: ArticleBlock) => void;
  theme?: "light" | "dark";
  /** Dans le panneau latéral : pas de carte doublon, fond déjà défini. */
  embedded?: boolean;
}) {
  const dark = theme === "dark";

  if (!block) {
    return (
      <div
        className={
          dark
            ? embedded
              ? "rounded-lg border border-dashed border-zinc-800/80 px-3 py-8 text-center text-[11px] leading-relaxed text-zinc-500"
              : "rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-10 text-center text-xs text-zinc-500"
            : "rounded-lg border border-stone-100 bg-stone-50/50 px-4 py-10 text-center text-xs text-stone-500"
        }
      >
        Sélectionnez un bloc dans la structure ou l’aperçu pour afficher ses réglages.
      </div>
    );
  }

  const label =
    block.type === "heading"
      ? "Titre"
      : block.type === "paragraph"
        ? "Paragraphe"
        : block.type === "image"
          ? "Image"
          : block.type === "quote"
            ? "Citation"
            : block.type === "divider"
              ? "Séparateur"
              : "Galerie";

  const shell =
    embedded && dark
      ? "space-y-4 rounded-lg border border-zinc-800/70 bg-zinc-900/30 p-3"
      : dark
        ? "space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/80 p-4"
        : "space-y-4 rounded-lg border border-stone-200/80 bg-white p-4 shadow-sm";

  const lbl = dark ? "text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500" : "text-[10px] font-medium uppercase tracking-[0.2em] text-stone-500";
  const sublbl = dark ? "block text-[11px] text-zinc-400" : "block text-[11px] text-stone-600";
  const input = dark
    ? "mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/25"
    : "mt-2 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-stone-400 focus:outline-none";
  const inputMono = dark
    ? "mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 focus:border-rose-500/50 focus:outline-none"
    : "mt-1 w-full rounded-md border border-stone-200 px-3 py-2 font-mono text-xs focus:border-stone-400 focus:outline-none";

  const btnOn = dark ? "bg-rose-600 text-white" : "bg-stone-900 text-white";
  const btnOff = dark
    ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
    : "bg-stone-100 text-stone-600 hover:bg-stone-200";

  return (
    <div className={shell}>
      <p className={lbl}>{label}</p>

      {block.type === "heading" ? (
        <div className="space-y-3">
          <label className={sublbl}>Niveau</label>
          <div className="flex gap-2">
            {([1, 2, 3] as const).map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => onChange({ ...block, level: lv })}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  block.level === lv ? btnOn : btnOff
                }`}
              >
                H{lv}
              </button>
            ))}
          </div>
          <label className={`${sublbl} mt-2`}>Texte</label>
          <input
            type="text"
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            className={
              dark
                ? `${input} font-[family-name:var(--font-serif)]`
                : `${input} font-[family-name:var(--font-serif)] text-stone-900`
            }
          />
        </div>
      ) : null}

      {block.type === "paragraph" || block.type === "quote" ? (
        <div className="space-y-2">
          <label className={sublbl}>Contenu — modifiable aussi dans l’aperçu</label>
          <InlineHtmlField blockId={block.id} html={block.html} onCommit={(h) => onChange({ ...block, html: h })} dark={dark} />
        </div>
      ) : null}

      {block.type === "image" ? (
        <div className="space-y-3">
          <EditorImageUpload
            variant={dark ? "dark" : "light"}
            label="Téléverser une image"
            onUploaded={(url) => onChange({ ...block, src: url })}
          />
          <div>
            <label className={sublbl}>URL</label>
            <input
              type="url"
              value={block.src}
              onChange={(e) => onChange({ ...block, src: e.target.value })}
              className={inputMono}
              placeholder="https://"
            />
          </div>
          <div>
            <label className={sublbl}>Texte alternatif</label>
            <input type="text" value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })} className={input} />
          </div>
          <div>
            <label className={sublbl}>Légende</label>
            <input
              type="text"
              value={block.caption}
              onChange={(e) => onChange({ ...block, caption: e.target.value })}
              className={input}
            />
          </div>
          <div>
            <label className={sublbl}>Largeur ({block.widthPercent}%)</label>
            <input
              type="range"
              min={25}
              max={100}
              value={block.widthPercent}
              onChange={(e) => onChange({ ...block, widthPercent: Number(e.target.value) })}
              className={dark ? "mt-2 w-full accent-rose-500" : "mt-2 w-full accent-stone-900"}
            />
          </div>
          <div>
            <label className={sublbl}>Alignement</label>
            <div className="mt-2 flex gap-2">
              {(
                [
                  ["left", "Gauche"],
                  ["center", "Centre"],
                  ["right", "Droite"],
                ] as const
              ).map(([v, t]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onChange({ ...block, align: v })}
                  className={`rounded-md px-3 py-1.5 text-xs ${block.align === v ? btnOn : btnOff}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {block.type === "gallery" ? (
        <div className="space-y-3">
          <p className={dark ? "text-xs text-zinc-400" : "text-xs text-stone-600"}>Ajoutez des images (URL ou téléversement).</p>
          <EditorImageUpload
            variant={dark ? "dark" : "light"}
            label="Ajouter à la galerie"
            onUploaded={(url) =>
              onChange({
                ...block,
                images: [...block.images, { src: url, alt: "" }],
              })
            }
          />
          <ul className="space-y-2">
            {block.images.map((im, i) => (
              <li
                key={`${block.id}-${i}`}
                className={
                  dark
                    ? "flex gap-2 rounded-md border border-zinc-800 p-2"
                    : "flex gap-2 rounded-md border border-stone-100 p-2"
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.src} alt="" className="h-14 w-20 shrink-0 rounded object-cover" />
                <div className="min-w-0 flex-1 space-y-1">
                  <input
                    type="text"
                    value={im.src}
                    onChange={(e) => {
                      const next = [...block.images];
                      next[i] = { ...im, src: e.target.value };
                      onChange({ ...block, images: next });
                    }}
                    className={
                      dark
                        ? "w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-[10px] text-zinc-200"
                        : "w-full rounded border border-stone-200 px-2 py-1 font-mono text-[10px]"
                    }
                  />
                  <input
                    type="text"
                    placeholder="Alt"
                    value={im.alt}
                    onChange={(e) => {
                      const next = [...block.images];
                      next[i] = { ...im, alt: e.target.value };
                      onChange({ ...block, images: next });
                    }}
                    className={
                      dark
                        ? "w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
                        : "w-full rounded border border-stone-200 px-2 py-1 text-xs"
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = block.images.filter((_, j) => j !== i);
                    onChange({ ...block, images: next });
                  }}
                  className={
                    dark
                      ? "shrink-0 self-start rounded p-1 text-zinc-500 hover:bg-rose-500/15 hover:text-rose-400"
                      : "shrink-0 self-start rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-red-600"
                  }
                  aria-label="Retirer"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {block.type === "divider" ? (
        <p className={dark ? "text-xs text-zinc-500" : "text-xs text-stone-500"}>
          Ligne horizontale discrète — pas d’option supplémentaire.
        </p>
      ) : null}
    </div>
  );
}
