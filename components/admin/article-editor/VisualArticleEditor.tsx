"use client";

import { useCallback, useMemo, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { type DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { ArticleBlock } from "@/lib/article-blocks/types";
import { createBlock } from "@/lib/article-blocks/types";
import { blocksToTipTap, tipTapToBlocks } from "@/lib/article-blocks/tiptap-convert";
import { EditorBlocksPanel } from "@/components/admin/article-editor/EditorBlocksPanel";
import { ArticlePublicLayout } from "@/components/article/ArticlePublicLayout";
import { ArticleTiptapSurface } from "@/components/article/ArticleTiptapSurface";
import {
  EDITOR_BAR_TOP,
  SITE_HEADER_HEIGHT_MD,
  SITE_HEADER_HEIGHT_MOBILE,
} from "@/components/admin/article-editor/editor-layout-constants";
import type { EditorViewportMode } from "@/components/admin/article-editor/EditorViewportToggle";
import { buildArticleSurfaceHtml } from "@/lib/article-surface-html";
import {
  isMagazineColumnArticle,
  isPairCarouselArticle,
  isSplitCarouselArticle,
  splitCarouselExcludeHeadingSplits,
  splitCarouselSkipLeadingSplits,
} from "@/lib/article-layout-variants";

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

type BlockKind = ArticleBlock["type"];

/** Languette gauche : centrée verticalement dans l’espace sous header site + barre d’édition (`--editor-fixed-stack`). */
function EditorLeftDock({ leftPanelOpen, onOpenPanel }: { leftPanelOpen: boolean; onOpenPanel: () => void }) {
  if (leftPanelOpen) return null;

  const stack = "var(--editor-fixed-stack, 3.75rem)";
  return (
    <div
      className="pointer-events-auto fixed left-0 z-[62] flex w-7 -translate-y-1/2 flex-col overflow-hidden rounded-r-[10px] border-y border-r border-zinc-700 bg-zinc-950 shadow-[4px_0_24px_rgba(0,0,0,0.5)]"
      style={{
        top: `calc(${stack} + (100dvh - ${stack}) / 2)`,
      }}
    >
      <button
        type="button"
        onClick={onOpenPanel}
        className="flex h-12 w-full shrink-0 items-center justify-center text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
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

/** Tablette / mobile : cadre centré. Desktop : comme le site (pleine largeur). */
const previewWidthClass: Record<EditorViewportMode, string> = {
  desktop: "w-full max-w-none",
  mobile: "w-full max-w-[390px]",
};

export function VisualArticleEditor({
  blocks,
  onChange,
  preview,
  viewport,
  articleSlug,
  liveSurfaceEdit = false,
  stackBelowSiteHeader = false,
}: {
  blocks: ArticleBlock[];
  onChange: (next: ArticleBlock[] | ((prev: ArticleBlock[]) => ArticleBlock[])) => void;
  preview: VisualArticlePreviewProps;
  viewport: EditorViewportMode;
  /** Slug courant de l’article : mêmes règles de mise en page que la page publique. */
  articleSlug: string;
  /** Édition inline sur le HTML 1:1 (ex. page publique ?edit=1). */
  liveSurfaceEdit?: boolean;
  /** Sous le `Header` du site (édition `?edit=1`) : décaler panneaux fixes. */
  stackBelowSiteHeader?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(() => blocks[0]?.id ?? null);
  const [widgetQuery, setWidgetQuery] = useState("");
  const [paletteTab, setPaletteTab] = useState<"widgets" | "layers">("widgets");
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);

  const magazineColumn = isMagazineColumnArticle(articleSlug);
  const pairCarousel = !magazineColumn && isPairCarouselArticle(articleSlug);
  const splitCarousel = !magazineColumn && isSplitCarouselArticle(articleSlug);
  const splitCarouselSkipLeading =
    !magazineColumn && splitCarousel ? splitCarouselSkipLeadingSplits(articleSlug) : 0;
  const splitCarouselExcludeHeadingInCopy =
    !magazineColumn && splitCarousel && splitCarouselExcludeHeadingSplits(articleSlug);

  const tipTapDoc = useMemo(() => blocksToTipTap(blocks), [blocks]);
  const bodyHtml = useMemo(
    () =>
      buildArticleSurfaceHtml(tipTapDoc as object, {
        layoutVariant: magazineColumn ? "magazine-column" : "default",
      }),
    [tipTapDoc, magazineColumn],
  );

  const onLiveTipTapDocChange = useCallback(
    (doc: JSONContent) => {
      onChange(tipTapToBlocks(doc));
    },
    [onChange],
  );

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

  function updateBlock(id: string, patch: ArticleBlock) {
    onChange((prev) => prev.map((b) => (b.id !== id ? b : patch)));
  }

  function removeBlock(id: string) {
    onChange((prev) => {
      const next = prev.filter((b) => b.id !== id);
      return next.length > 0 ? next : [createBlock("paragraph")];
    });
    /** `selectedResolved` rechoisit `blocks[0]` après rendu — évite `fallback[0]` stale / undefined. */
    setSelectedId((sel) => (sel === id ? null : sel));
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
      className={
        stackBelowSiteHeader
          ? `relative bg-[#fafafa] [--editor-fixed-stack:calc(${SITE_HEADER_HEIGHT_MOBILE}+${EDITOR_BAR_TOP})] md:[--editor-fixed-stack:calc(${SITE_HEADER_HEIGHT_MD}+${EDITOR_BAR_TOP})] min-h-[calc(100dvh-5rem-3.75rem)] md:min-h-[calc(100dvh-6rem-3.75rem)]`
          : "relative bg-[#fafafa] min-h-[calc(100dvh-3.75rem)]"
      }
      style={
        stackBelowSiteHeader ? undefined : { ["--editor-fixed-stack" as string]: EDITOR_BAR_TOP }
      }
    >
      <aside
        className={`fixed left-0 z-[55] flex w-[min(100vw-1rem,320px)] min-h-0 min-w-[min(280px,100vw-1rem)] max-w-[min(320px,100vw-0.5rem)] flex-col overflow-hidden border-r border-zinc-700 bg-zinc-950 shadow-xl shadow-black/40 transition-transform duration-300 ease-out max-[768px]:min-w-0 ${
          leftPanelOpen ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none"
        }`}
        style={{
          top: "var(--editor-fixed-stack)",
          height: "calc(100dvh - var(--editor-fixed-stack))",
        }}
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
          articleSurface={magazineColumn ? "magazine-column" : "default"}
        >
          <ArticleTiptapSurface
            html={bodyHtml}
            layoutVariant={magazineColumn ? "magazine-column" : "default"}
            pairCarousel={pairCarousel}
            splitCarousel={splitCarousel}
            splitCarouselSkipLeading={splitCarouselSkipLeading}
            splitCarouselExcludeHeadingInCopy={splitCarouselExcludeHeadingInCopy}
            editMode={liveSurfaceEdit}
            onLiveTipTapDocChange={liveSurfaceEdit ? onLiveTipTapDocChange : undefined}
          />
        </ArticlePublicLayout>
      </div>
    </div>
  );
}
