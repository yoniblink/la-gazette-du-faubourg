"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { type DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { ArticleBlock } from "@/lib/article-blocks/types";
import { createBlock } from "@/lib/article-blocks/types";
import { blockToHtml } from "@/lib/article-blocks/tiptap-convert";
import { EditorBlocksPanel } from "@/components/admin/article-editor/EditorBlocksPanel";
import { ImageBlockPreview } from "@/components/admin/article-editor/ImageBlockPreview";
import { SelectedBlockDelete } from "@/components/admin/article-editor/SelectedBlockDelete";
import { ArticlePublicLayout, type ArticleInlineEditProps } from "@/components/article/ArticlePublicLayout";
import { EDITOR_BAR_TOP } from "@/components/admin/article-editor/editor-layout-constants";
import type { EditorViewportMode } from "@/components/admin/article-editor/EditorViewportToggle";

export type VisualArticlePreviewProps = {
  categorySlug: string;
  categoryTitle: string;
  title: string;
  kicker: string;
  excerpt: string;
  publishedAt: Date | null;
  authorName: string;
  coverImageUrl: string;
  coverImageAlt: string;
  coverObjectPosition: string;
  sourceUrl: string;
};

export type { ArticleInlineEditProps };

type BlockKind = ArticleBlock["type"];

/** Languette au bord gauche : uniquement la flèche pour ouvrir blocs / structure. */
function EditorLeftDock({ leftPanelOpen, onOpenPanel }: { leftPanelOpen: boolean; onOpenPanel: () => void }) {
  if (leftPanelOpen) return null;

  return (
    <div
      className="pointer-events-auto fixed left-0 z-40 flex w-7 -translate-y-1/2 flex-col overflow-hidden rounded-r-[10px] border border-black/[0.07] border-l-0 bg-[#f3f3f4]/95 shadow-[3px_0_14px_rgba(10,10,10,0.07)] backdrop-blur-[6px]"
      style={{ top: `calc(${EDITOR_BAR_TOP} + (100dvh - ${EDITOR_BAR_TOP}) / 2)` }}
    >
      <button
        type="button"
        onClick={onOpenPanel}
        className="flex h-12 w-full shrink-0 items-center justify-center text-zinc-500 transition-colors hover:bg-black/[0.035] hover:text-zinc-900"
        title="Blocs et structure"
        aria-label="Ouvrir le panneau blocs et structure"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}

function PreviewChunk({
  block,
  selected,
  onSelect,
  onUpdate,
  onRemove,
}: {
  block: ArticleBlock;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (u: ArticleBlock | ((current: ArticleBlock) => ArticleBlock)) => void;
  onRemove: () => void;
}) {
  if (block.type === "image") {
    return (
      <ImageBlockPreview
        block={block}
        selected={selected}
        onSelect={onSelect}
        onUpdate={(next) => {
          onUpdate(next);
        }}
        onRemove={onRemove}
      />
    );
  }

  const html = useMemo(() => blockToHtml(block), [block]);
  const ref = useRef<HTMLDivElement>(null);
  const editable = block.type === "heading" || block.type === "paragraph" || block.type === "quote";

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !editable) return;
    const focused = document.activeElement === el;
    const innerHtml = el.innerHTML;
    const equal = innerHtml === html;
    const innerText = el.textContent ?? "";
    const htmlText = html.replace(/<[^>]+>/g, "").trim();
    const htmlLooksEmpty = htmlText.length === 0;
    if (focused) return;
    // Ne pas écraser avec un html obsolète (ex. focus ailleurs avant le blur) : onInput tient le state à jour
    if (equal) return;
    // Si le state contient un HTML "vide" mais que le DOM affiche encore du texte,
    // considérer le DOM comme source de vérité et ne pas tout effacer visuellement.
    if (!focused && htmlLooksEmpty && innerText.trim().length > 0) {
      return;
    }
    el.innerHTML = html;
  }, [html, editable, block.id, block.type]);

  const ring = selected
    ? "ring-2 ring-rose-500/40 ring-offset-2 ring-offset-[#fafafa]"
    : "hover:ring-1 hover:ring-zinc-300/80";

  if (!editable) {
    return (
      <div className={`relative rounded-sm transition-shadow ${ring}`}>
        {selected ? <SelectedBlockDelete onRemove={onRemove} /> : null}
        <div
          role="presentation"
          className="rounded-sm"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect();
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-sm transition-shadow ${ring}`}>
      {selected ? <SelectedBlockDelete onRemove={onRemove} /> : null}
      <div
        className="rounded-sm"
        onMouseDown={(e) => {
          onSelect();
        }}
      >
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          tabIndex={0}
          aria-multiline={block.type !== "heading"}
          className="cursor-text outline-none focus:outline-none"
          onInput={(e) => {
            const el = e.currentTarget;
            const htmlLive = el.innerHTML;
            const textLive = el.textContent ?? "";
            onUpdate((b) => {
              if (b.type === "heading") return { ...b, text: textLive };
              if (b.type === "paragraph" || b.type === "quote") return { ...b, html: htmlLive };
              return b;
            });
          }}
          onBlur={(e) => {
            const el = e.currentTarget;
            const htmlSnap = el.innerHTML;
            const textTrim = el.textContent?.trim() ?? "";
            onUpdate((b) => {
              if (b.type === "heading") return { ...b, text: textTrim };
              if (b.type === "paragraph" || b.type === "quote") return { ...b, html: htmlSnap };
              return b;
            });
          }}
        />
      </div>
    </div>
  );
}

/** Tablette / mobile : cadre centré. Desktop : comme le site (pleine largeur). */
const previewWidthClass: Record<EditorViewportMode, string> = {
  desktop: "w-full max-w-none",
  mobile: "w-full max-w-[390px]",
};

export function VisualArticleEditor({
  blocks,
  onChange,
  preview,
  inlineEdit,
  viewport,
}: {
  blocks: ArticleBlock[];
  onChange: (next: ArticleBlock[] | ((prev: ArticleBlock[]) => ArticleBlock[])) => void;
  preview: VisualArticlePreviewProps;
  inlineEdit: ArticleInlineEditProps;
  viewport: EditorViewportMode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(() => blocks[0]?.id ?? null);
  const [widgetQuery, setWidgetQuery] = useState("");
  const [paletteTab, setPaletteTab] = useState<"widgets" | "layers">("widgets");
  /** Replié par défaut pour maximiser l’aperçu (onglet sur le bord pour rouvrir). */
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);

  const selectedResolved = useMemo(() => {
    if (selectedId != null && blocks.some((b) => b.id === selectedId)) return selectedId;
    return blocks[0]?.id ?? null;
  }, [blocks, selectedId]);

  const selected = blocks.find((b) => b.id === selectedResolved) ?? null;

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex((b) => b.id === active.id);
    const newIdx = blocks.findIndex((b) => b.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onChange((prev) => arrayMove(prev, oldIdx, newIdx));
  }

  function applyBlockUpdate(id: string, u: ArticleBlock | ((current: ArticleBlock) => ArticleBlock)) {
    onChange((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        return typeof u === "function" ? (u as (c: ArticleBlock) => ArticleBlock)(b) : u;
      }),
    );
  }

  function updateBlock(id: string, patch: ArticleBlock) {
    applyBlockUpdate(id, patch);
  }

  function removeBlock(id: string) {
    let fallback: ArticleBlock[] = [];
    onChange((prev) => {
      const next = prev.filter((b) => b.id !== id);
      fallback = next.length ? next : [createBlock("paragraph")];
      return fallback;
    });
    if (selectedId === id) setSelectedId(fallback[0]!.id);
  }

  function addBlock(type: BlockKind) {
    setLeftPanelOpen(true);
    const row = createBlock(type);
    onChange((prev) => [...prev, row]);
    setSelectedId(row.id);
    setPaletteTab("layers");
  }

  return (
    <div
      className="relative bg-[#fafafa]"
      style={{ minHeight: `calc(100dvh - ${EDITOR_BAR_TOP})` }}
    >
      <aside
        className={`fixed bottom-0 left-0 z-30 flex w-[min(100vw-1rem,320px)] min-w-[280px] max-w-[320px] flex-col border-r border-stone-200 bg-white shadow-xl shadow-black/10 transition-transform duration-300 ease-out ${
          leftPanelOpen ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none"
        }`}
        style={{ top: EDITOR_BAR_TOP }}
        aria-hidden={!leftPanelOpen}
      >
        <EditorBlocksPanel
          blocks={blocks}
          selectedId={selectedResolved}
          widgetQuery={widgetQuery}
          onWidgetQueryChange={setWidgetQuery}
          paletteTab={paletteTab}
          onPaletteTabChange={setPaletteTab}
          onClose={() => setLeftPanelOpen(false)}
          onAddBlock={addBlock}
          onSelectBlock={setSelectedId}
          onRemoveBlock={removeBlock}
          onDragEnd={onDragEnd}
          selectedBlock={selected}
          onUpdateBlock={(b) => updateBlock(b.id, b)}
        />
      </aside>

      <EditorLeftDock leftPanelOpen={leftPanelOpen} onOpenPanel={() => setLeftPanelOpen(true)} />

      <div
        className={`transition-[max-width] duration-300 ${
          viewport === "desktop" ? "w-full" : `mx-auto ${previewWidthClass[viewport]}`
        }`}
      >
        <ArticlePublicLayout
          categorySlug={preview.categorySlug}
          categoryTitle={preview.categoryTitle}
          title={preview.title}
          kicker={preview.kicker.trim() ? preview.kicker : undefined}
          excerpt={preview.excerpt}
          publishedAt={preview.publishedAt}
          authorName={preview.authorName.trim() ? preview.authorName : undefined}
          coverImageUrl={preview.coverImageUrl}
          coverImageAlt={preview.coverImageAlt}
          coverObjectPosition={preview.coverObjectPosition}
          sourceUrl={preview.sourceUrl.trim() ? preview.sourceUrl : undefined}
          inlineEdit={inlineEdit}
        >
          <div className="article-tiptap-html mt-12 space-y-6">
            {blocks.map((b) => (
              <PreviewChunk
                key={b.id}
                block={b}
                selected={selectedResolved === b.id}
                onSelect={() => setSelectedId(b.id)}
                onUpdate={(u) => applyBlockUpdate(b.id, u)}
                onRemove={() => removeBlock(b.id)}
              />
            ))}
          </div>
        </ArticlePublicLayout>
      </div>
    </div>
  );
}
