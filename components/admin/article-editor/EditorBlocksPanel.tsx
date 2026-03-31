"use client";

import { useMemo, type ReactElement } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ArticleBlock } from "@/lib/article-blocks/types";
import { BlockInspector } from "@/components/admin/article-editor/BlockInspector";

type BlockKind = ArticleBlock["type"];

const BLOCK_TYPE_FR: Record<ArticleBlock["type"], string> = {
  heading: "Titre",
  paragraph: "Texte",
  image: "Image",
  quote: "Citation",
  divider: "Séparateur",
  gallery: "Galerie",
};

function blockSummary(b: ArticleBlock): string {
  switch (b.type) {
    case "heading":
      return b.text.trim() || "Sans texte";
    case "paragraph": {
      const t = b.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return t.slice(0, 56) || "Vide";
    }
    case "image":
      return b.src ? "Avec média" : "URL manquante";
    case "quote": {
      const t = b.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return t.slice(0, 48) || "Vide";
    }
    case "divider":
      return "Ligne";
    case "gallery":
      return `${b.images.length} image(s)`;
    default: {
      const _e: never = b;
      return String(_e);
    }
  }
}

const BLOCK_LIBRARY: { type: BlockKind; label: string; description: string; Icon: () => ReactElement }[] = [
  {
    type: "heading",
    label: "Titre",
    description: "Intertitre",
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.35">
        <path strokeLinecap="round" d="M5 5h5v14H5M14 9h5m-5-4v8" />
      </svg>
    ),
  },
  {
    type: "paragraph",
    label: "Texte",
    description: "Paragraphe",
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.35">
        <path strokeLinecap="round" d="M5 7h14M5 12h10M5 17h14" />
      </svg>
    ),
  },
  {
    type: "image",
    label: "Image",
    description: "Photo, légende",
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.35">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10" r="1.35" fill="currentColor" stroke="none" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
  {
    type: "quote",
    label: "Citation",
    description: "Bloc mis en avant",
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M7 7a4 4 0 00-4 4v6h6v-6H5a2 2 0 012-2V7H7zm10 0a4 4 0 00-4 4v6h6v-6h-4a2 2 0 012-2V7h-4z" />
      </svg>
    ),
  },
  {
    type: "divider",
    label: "Séparateur",
    description: "Ligne fine",
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.35">
        <path strokeLinecap="round" d="M5 12h14" />
      </svg>
    ),
  },
  {
    type: "gallery",
    label: "Galerie",
    description: "Plusieurs images",
    Icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.35">
        <rect x="2" y="4" width="8" height="8" rx="1" />
        <rect x="14" y="4" width="8" height="8" rx="1" />
        <rect x="2" y="14" width="8" height="8" rx="1" />
        <rect x="14" y="14" width="8" height="8" rx="1" />
      </svg>
    ),
  },
];

function SortableLayerRow({
  block,
  selected,
  onSelect,
  onRemove,
}: {
  block: ArticleBlock;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      id={`layer-${block.id}`}
      ref={setNodeRef}
      style={style}
      className={`group flex items-stretch gap-0 rounded-xl border transition-colors ${
        selected
          ? "border-rose-300 bg-rose-50 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.1)]"
          : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
      } ${isDragging ? "z-10 scale-[1.01] opacity-95 shadow-lg shadow-black/10" : ""}`}
    >
      <button
        type="button"
        className="flex w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-xl border-r border-stone-200 bg-stone-50 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 active:cursor-grabbing"
        aria-label="Déplacer"
        {...attributes}
        {...listeners}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="9" cy="8" r="1.25" />
          <circle cx="15" cy="8" r="1.25" />
          <circle cx="9" cy="12" r="1.25" />
          <circle cx="15" cy="12" r="1.25" />
          <circle cx="9" cy="16" r="1.25" />
          <circle cx="15" cy="16" r="1.25" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 px-2.5 py-2.5 text-left"
      >
        <span className="inline-flex items-center rounded-md bg-stone-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-stone-500">
          {BLOCK_TYPE_FR[block.type]}
        </span>
        <span className="mt-1 block truncate text-[12px] leading-snug text-stone-800">{blockSummary(block)}</span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="flex w-9 shrink-0 items-center justify-center rounded-r-xl border-l border-stone-200 bg-transparent text-stone-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
        aria-label="Supprimer le bloc"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

type PanelTab = "widgets" | "layers";

export function EditorBlocksPanel({
  blocks,
  selectedId,
  widgetQuery,
  onWidgetQueryChange,
  paletteTab,
  onPaletteTabChange,
  onClose,
  onAddBlock,
  onSelectBlock,
  onRemoveBlock,
  onDragEnd,
  selectedBlock,
  onUpdateBlock,
}: {
  blocks: ArticleBlock[];
  selectedId: string | null;
  widgetQuery: string;
  onWidgetQueryChange: (q: string) => void;
  paletteTab: PanelTab;
  onPaletteTabChange: (t: PanelTab) => void;
  onClose: () => void;
  onAddBlock: (type: BlockKind) => void;
  onSelectBlock: (id: string) => void;
  onRemoveBlock: (id: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  selectedBlock: ArticleBlock | null;
  onUpdateBlock: (b: ArticleBlock) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const filteredLibrary = useMemo(() => {
    const q = widgetQuery.trim().toLowerCase();
    if (!q) return BLOCK_LIBRARY;
    return BLOCK_LIBRARY.filter(
      (w) =>
        w.label.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.type.includes(q),
    );
  }, [widgetQuery]);

  const tabs: { id: PanelTab; label: string }[] = [
    { id: "widgets", label: "Bibliothèque" },
    { id: "layers", label: "Structure" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-stone-200 bg-white px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-800">Blocs</h2>
            <p className="mt-0.5 text-[11px] leading-snug text-stone-500">Insérer des widgets et ordonner le contenu.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
            title="Fermer le panneau"
            aria-label="Fermer le panneau"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        </div>

        <div className="relative mt-3">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path strokeLinecap="round" d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="search"
            value={widgetQuery}
            onChange={(e) => onWidgetQueryChange(e.target.value)}
            placeholder="Filtrer les blocs…"
            className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-8 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-200"
          />
        </div>

        <div
          className="mt-3 flex rounded-lg border border-stone-200 bg-stone-50 p-0.5"
          role="tablist"
          aria-label="Mode du panneau"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={paletteTab === t.id}
              onClick={() => onPaletteTabChange(t.id)}
              className={`flex-1 rounded-md px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                paletteTab === t.id
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {paletteTab === "widgets" ? (
          <div className="px-3 py-4">
            <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-500">À ajouter au document</p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filteredLibrary.map(({ type, label, description, Icon }) => (
                <li key={type}>
                  <button
                    type="button"
                    onClick={() => onAddBlock(type)}
                    className="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-3 text-left transition-colors hover:border-stone-300 hover:bg-stone-50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
                      <Icon />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-stone-900">{label}</span>
                      <span className="mt-0.5 block text-[11px] text-stone-500">{description}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {filteredLibrary.length === 0 ? (
              <p className="py-8 text-center text-xs text-stone-500">Aucun bloc ne correspond au filtre.</p>
            ) : null}
          </div>
        ) : (
          <div className="px-3 py-4">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-500">
              Ordre dans l’article · {blocks.length} bloc{blocks.length !== 1 ? "s" : ""}
            </p>
            <DndContext id="gazette-article-editor-blocks" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <ul className="flex flex-col gap-2">
                  {blocks.map((b) => (
                    <li key={b.id}>
                      <SortableLayerRow
                        block={b}
                        selected={selectedId === b.id}
                        onSelect={() => onSelectBlock(b.id)}
                        onRemove={() => onRemoveBlock(b.id)}
                      />
                    </li>
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-3 py-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Propriétés</h3>
        </div>
        <div className="max-h-[min(40vh,320px)] overflow-y-auto overscroll-contain px-3 py-3">
          <BlockInspector theme="light" embedded block={selectedBlock} onChange={onUpdateBlock} />
        </div>
      </footer>
    </div>
  );
}
