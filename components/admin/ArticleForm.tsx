"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import Image, { type ImageLoader } from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import type { Article, Category } from "@prisma/client";
import type { JSONContent } from "@tiptap/core";
import { createArticle, updateArticle, type ArticleActionResult } from "@/app/admin/(panel)/articles/actions";
import { parseCoverFocus } from "@/lib/cover-object-position";
import { emptyTipTapDoc } from "@/lib/tiptap/empty-doc";
import { slugify } from "@/lib/slugify";
import type { ArticleBlock } from "@/lib/article-blocks/types";
import { emptyBlocks } from "@/lib/article-blocks/types";
import { blocksToTipTap, tipTapToBlocks } from "@/lib/article-blocks/tiptap-convert";
import { VisualArticleEditor } from "@/components/admin/article-editor/VisualArticleEditor";
import {
  EditorViewportToggle,
  type EditorViewportMode,
} from "@/components/admin/article-editor/EditorViewportToggle";
import { EditorImageUpload } from "@/components/admin/article-editor/EditorImageUpload";
import { EDITOR_BAR_TOP } from "@/components/admin/article-editor/editor-layout-constants";
import { useArticleBlocksHistory } from "@/components/admin/article-editor/useArticleBlocksHistory";
import { DeleteArticleButton } from "@/components/admin/DeleteArticleButton";

function isTypingContext(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el instanceof HTMLElement && el.isContentEditable;
}

function ArticleEditorTopBar({
  userEmail,
  titlePreview,
  publishOn,
  isEdit,
  settingsOpen,
  onToggleSettings,
  viewport,
  onViewportChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  articlesIndexHref,
}: {
  userEmail: string;
  titlePreview: string;
  publishOn: boolean;
  isEdit: boolean;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  viewport: EditorViewportMode;
  onViewportChange: (v: EditorViewportMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  articlesIndexHref: string;
}) {
  const { pending } = useFormStatus();
  const display = titlePreview.trim() || "Sans titre";
  return (
    <div
      className="sticky top-0 z-50 border-b border-stone-200 bg-white px-2 py-2 shadow-sm sm:px-4"
      style={{ minHeight: EDITOR_BAR_TOP }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2 justify-self-start sm:gap-3">
          <Link
            href={articlesIndexHref}
            className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-stone-500 transition-colors hover:text-stone-900"
          >
            ← Articles
          </Link>
          <div className="min-w-0 border-l border-stone-200 pl-2 sm:pl-3">
            <p className="truncate font-[family-name:var(--font-sans)] text-[9px] font-medium uppercase tracking-[0.14em] text-stone-500">
              {isEdit ? "Article" : "Nouvel article"}
            </p>
            <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
              <p className="truncate font-[family-name:var(--font-serif)] text-sm font-light tracking-tight text-stone-900 sm:text-[15px]">
                {display}
              </p>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
                  publishOn ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                }`}
              >
                {publishOn ? "Publié" : "Brouillon"}
              </span>
            </div>
          </div>
        </div>

        <div className="justify-self-center flex items-center gap-1 sm:gap-2">
          <div className="flex items-center rounded-lg border border-stone-200 bg-stone-50 p-0.5">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title="Annuler — ⌘Z / Ctrl+Z"
              aria-label="Annuler la dernière modification du contenu"
              className="rounded-md px-2 py-2 text-stone-500 transition-colors enabled:hover:bg-stone-200 enabled:hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <svg className="h-4 w-4 sm:h-[18px] sm:w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L4 9l5-6 M4 9h10.5a5.5 5.5 0 010 11H12" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title="Rétablir — ⇧⌘Z / Ctrl+Y"
              aria-label="Rétablir une modification annulée"
              className="rounded-md px-2 py-2 text-stone-500 transition-colors enabled:hover:bg-stone-200 enabled:hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <svg className="h-4 w-4 sm:h-[18px] sm:w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l5-6-5-6 M20 9H9.5a5.5 5.5 0 000 11H12" />
              </svg>
            </button>
          </div>
          <EditorViewportToggle value={viewport} onChange={onViewportChange} />
      </div>

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 sm:gap-2">
          <span className="hidden max-w-[8.5rem] truncate text-[10px] text-stone-500 lg:inline" title={userEmail}>
            {userEmail}
          </span>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="hidden shrink-0 rounded-lg px-2 py-1.5 text-[10px] text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 sm:inline"
          >
            Déconnexion
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="sm:hidden shrink-0 rounded-lg px-2 py-1.5 text-[10px] text-stone-500 hover:bg-stone-100 hover:text-stone-900"
            title="Déconnexion"
            aria-label="Déconnexion"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onToggleSettings}
            aria-expanded={settingsOpen}
            aria-controls="article-settings-panel"
            title="Réglages de l’article"
            className={`rounded-lg border p-2.5 transition-colors ${
              settingsOpen
                ? "border-violet-300 bg-violet-50 text-violet-700"
                : "border-stone-300 text-stone-500 hover:border-stone-400 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.723 6.723 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.077-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-stone-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-stone-800 disabled:opacity-50"
          >
            {pending ? "…" : isEdit ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ArticleForm({
  userEmail,
  article,
  categories,
  defaultCategoryId,
  articlesIndexHref = "/admin/articles",
}: {
  userEmail: string;
  article?: Article;
  categories: Category[];
  /** When creating an article, preselect this category (id). */
  defaultCategoryId?: string;
  /** List view + redirects after save/delete context. */
  articlesIndexHref?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(article);
  const action = isEdit ? updateArticle : createArticle;
  const [state, formAction] = useActionState(action, null as ArticleActionResult | null);

  const initialBlocks = useMemo((): ArticleBlock[] => {
    if (article?.content && typeof article.content === "object") {
      return tipTapToBlocks(article.content as JSONContent);
    }
    return emptyBlocks();
  }, [article?.content]);

  const { blocks, setBlocks, undo, redo, canUndo, canRedo } = useArticleBlocksHistory(initialBlocks);

  const contentTipTap = useMemo(() => blocksToTipTap(blocks), [blocks]);

  const initialTitle = article?.title ?? "";
  const initialSlug = article?.slug ?? "";

  const [titleInp, setTitleInp] = useState(initialTitle);
  const [slugInp, setSlugInp] = useState(initialSlug || slugify(initialTitle));
  const [slugManual, setSlugManual] = useState(() =>
    Boolean(article?.slug && article.slug !== slugify(article.title ?? "")),
  );

  const [publishOn, setPublishOn] = useState(article?.status === "PUBLISHED");

  const initialFocus = parseCoverFocus(article?.coverObjectPosition);
  const [coverImageUrl, setCoverImageUrl] = useState(article?.coverImageUrl ?? "");
  const [coverFocusX, setCoverFocusX] = useState(initialFocus.x);
  const [coverFocusY, setCoverFocusY] = useState(initialFocus.y);

  const [categoryId, setCategoryId] = useState(
    () =>
      article?.categoryId ??
      (defaultCategoryId && categories.some((c) => c.id === defaultCategoryId)
        ? defaultCategoryId
        : undefined) ??
      categories[0]?.id ??
      "",
  );
  const [kickerInp, setKickerInp] = useState(article?.kicker ?? "");
  const [excerptInp, setExcerptInp] = useState(article?.excerpt ?? "");
  const [authorInp, setAuthorInp] = useState(article?.authorName ?? "La Gazette");
  const [coverAltInp, setCoverAltInp] = useState(article?.coverImageAlt ?? "");
  const [sourceUrlInp, setSourceUrlInp] = useState(article?.sourceUrl ?? "");

  const [layoutInp, setLayoutInp] = useState<"lead" | "standard">(
    article?.layout === "lead" ? "lead" : "standard",
  );
  const [featuredSortOrderInp, setFeaturedSortOrderInp] = useState(
    article?.featuredSortOrder ?? 0,
  );
  const [featuredOnHomeInp, setFeaturedOnHomeInp] = useState(
    article?.featuredOnHome ?? false,
  );
  const [seoTitleInp, setSeoTitleInp] = useState(article?.seoTitle ?? "");
  const [seoDescriptionInp, setSeoDescriptionInp] = useState(article?.seoDescription ?? "");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editorViewport, setEditorViewport] = useState<EditorViewportMode>("desktop");

  const selectedCategory = useMemo(() => categories.find((c) => c.id === categoryId), [categories, categoryId]);

  const editorPreview = useMemo(
    () => ({
      categorySlug: selectedCategory?.slug ?? categories[0]?.slug ?? "",
      categoryTitle: selectedCategory?.title ?? categories[0]?.title ?? "",
      title: titleInp,
      kicker: kickerInp,
      excerpt: excerptInp,
      publishedAt: article?.publishedAt ?? null,
      authorName: authorInp,
      coverImageUrl,
      coverImageAlt: coverAltInp,
      coverObjectPosition: `${coverFocusX}% ${coverFocusY}%`,
      sourceUrl: sourceUrlInp,
    }),
    [
      selectedCategory,
      categories,
      titleInp,
      kickerInp,
      excerptInp,
      article?.publishedAt,
      authorInp,
      coverImageUrl,
      coverAltInp,
      coverFocusX,
      coverFocusY,
      sourceUrlInp,
    ],
  );

  useEffect(() => {
    if (!settingsOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [settingsOpen]);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(isEdit ? "Article enregistré." : "Article créé.");
      router.push(articlesIndexHref);
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, isEdit, router, articlesIndexHref]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (isTypingContext(document.activeElement)) return;
      const key = e.key.toLowerCase();
      const redoCombo = e.shiftKey && key === "z";
      const redoCtrlY = e.ctrlKey && !e.metaKey && key === "y";
      if (redoCombo || redoCtrlY) {
        if (!canRedo) return;
        e.preventDefault();
        redo();
        return;
      }
      if (key === "z" && !e.shiftKey) {
        if (!canUndo) return;
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canUndo, canRedo, undo, redo]);

  return (
    <form
      id="article-editor-form"
      onSubmit={(e) => {
        e.preventDefault();
        // Le panneau « Réglages » est démonté quand il est fermé : ne pas s’appuyer sur les inputs du DOM.
        const fd = new FormData();
        if (article?.id) fd.set("id", article.id);
        fd.set("title", titleInp);
        if (slugInp.trim()) fd.set("slug", slugInp);
        if (kickerInp.trim()) fd.set("kicker", kickerInp);
        fd.set("excerpt", excerptInp);
        fd.set("coverImageUrl", coverImageUrl);
        fd.set("coverImageAlt", coverAltInp);
        fd.set("coverObjectPosition", `${coverFocusX}% ${coverFocusY}%`);
        fd.set("categoryId", categoryId);
        fd.set("authorName", authorInp);
        if (seoTitleInp.trim()) fd.set("seoTitle", seoTitleInp);
        if (seoDescriptionInp.trim()) fd.set("seoDescription", seoDescriptionInp);
        if (sourceUrlInp.trim()) fd.set("sourceUrl", sourceUrlInp);
        fd.set("layout", layoutInp);
        fd.set("featuredSortOrder", String(featuredSortOrderInp));
        if (publishOn) fd.set("publish", "on");
        if (featuredOnHomeInp) fd.set("featuredOnHome", "on");
        fd.set("content", JSON.stringify(contentTipTap ?? emptyTipTapDoc));
        startTransition(() => {
          formAction(fd);
        });
      }}
      className="relative pb-8"
    >

      <ArticleEditorTopBar
        userEmail={userEmail}
        titlePreview={titleInp}
        publishOn={publishOn}
        isEdit={isEdit}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((o) => !o)}
        viewport={editorViewport}
        onViewportChange={setEditorViewport}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        articlesIndexHref={articlesIndexHref}
      />

      <div className="min-w-0">
        <VisualArticleEditor
          blocks={blocks}
          onChange={setBlocks}
          preview={editorPreview}
          viewport={editorViewport}
          inlineEdit={{
            onTitleChange: (t) => {
              setTitleInp(t);
              if (!slugManual) setSlugInp(slugify(t));
            },
            onKickerChange: setKickerInp,
            onExcerptChange: setExcerptInp,
            onRequestCoverSettings: () => setSettingsOpen(true),
          }}
        />
      </div>

      {settingsOpen ? (
        <div className="fixed inset-0 z-[90] flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            aria-label="Fermer le panneau"
            onClick={() => setSettingsOpen(false)}
          />
          <aside
            id="article-settings-panel"
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="article-settings-heading"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-5 py-4">
              <h2 id="article-settings-heading" className="text-sm font-medium text-stone-900">
                Réglages de l’article
              </h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
                aria-label="Fermer"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-8">
                <section>
                  <h3 className="text-[10px] font-medium uppercase tracking-[0.22em] text-stone-500">Métadonnées</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
                        Titre
                      </label>
                      <input
                        required
                        value={titleInp}
                        onChange={(e) => {
                          const v = e.target.value;
                          setTitleInp(v);
                          if (!slugManual) setSlugInp(slugify(v));
                        }}
                        className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-[family-name:var(--font-serif)] text-base text-stone-900 focus:border-stone-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
                        Slug
                      </label>
                      <input
                        value={slugInp}
                        onChange={(e) => {
                          setSlugManual(true);
                          setSlugInp(e.target.value);
                        }}
                        className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-mono text-sm focus:border-stone-400 focus:outline-none"
                      />
                      <p className="mt-1.5 text-[11px] text-stone-500">
                        Généré depuis le titre. Ajustez pour une URL fixe.
                      </p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
                        Rubrique
                      </label>
                      <select
                        required
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
                        Kicker
                      </label>
                      <input
                        value={kickerInp}
                        onChange={(e) => setKickerInp(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
                        Auteur
                      </label>
                      <input
                        value={authorInp}
                        onChange={(e) => setAuthorInp(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
                        Chapô
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={excerptInp}
                        onChange={(e) => setExcerptInp(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm leading-relaxed"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-medium uppercase tracking-[0.22em] text-stone-500">
                    Image de couverture
                  </h3>
                  <EditorImageUpload
                    className="mt-4"
                    label="Téléverser"
                    onUploaded={(url) => setCoverImageUrl(url)}
                  />
                  <div className="mt-4">
                    <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">URL</label>
                    <input
                      value={coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
                    />
                    <p className="mt-1.5 text-[11px] text-stone-500">
                      Laisser vide pour n’afficher que le corps (type page Elementor).
                    </p>
                  </div>
                  <div className="mt-4">
                    <label className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Alt</label>
                    <input
                      value={coverAltInp}
                      onChange={(e) => setCoverAltInp(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-stone-500">Cadrage (4∶3)</p>
                  <p className="mt-1 text-xs text-stone-600">Cliquez-glissez sur l’aperçu pour le point focal.</p>
                  <CoverCropPreview
                    coverImageUrl={coverImageUrl}
                    coverFocusX={coverFocusX}
                    coverFocusY={coverFocusY}
                    setCoverFocusX={setCoverFocusX}
                    setCoverFocusY={setCoverFocusY}
                  />
                </section>

                <section>
                  <h3 className="text-[10px] font-medium uppercase tracking-[0.22em] text-stone-500">SEO & affichage</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
                        Balise titre (SEO)
                      </label>
                      <input
                        value={seoTitleInp}
                        onChange={(e) => setSeoTitleInp(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
                        Meta description
                      </label>
                      <textarea
                        rows={2}
                        value={seoDescriptionInp}
                        onChange={(e) => setSeoDescriptionInp(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
                        URL source
                      </label>
                      <input
                        value={sourceUrlInp}
                        onChange={(e) => setSourceUrlInp(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <fieldset>
                      <legend className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
                        Carte d’accueil
                      </legend>
                      <div className="mt-2 flex flex-col gap-2 text-sm">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={layoutInp === "standard"}
                            onChange={() => setLayoutInp("standard")}
                          />
                          Standard
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={layoutInp === "lead"}
                            onChange={() => setLayoutInp("lead")}
                          />
                          Pleine largeur
                        </label>
                      </div>
                    </fieldset>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
                        Ordre à l’accueil
                      </label>
                      <input
                        type="number"
                        value={featuredSortOrderInp}
                        onChange={(e) => setFeaturedSortOrderInp(Number(e.target.value) || 0)}
                        className="mt-2 w-32 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-3 pt-1">
                      <label className="flex items-center gap-2 text-sm text-stone-700">
                        <input
                          type="checkbox"
                          value="on"
                          checked={publishOn}
                          onChange={(e) => setPublishOn(e.target.checked)}
                          className="rounded border-stone-300"
                        />
                        Publié
                      </label>
                      <label className="flex items-center gap-2 text-sm text-stone-700">
                        <input
                          type="checkbox"
                          value="on"
                          checked={featuredOnHomeInp}
                          onChange={(e) => setFeaturedOnHomeInp(e.target.checked)}
                          className="rounded border-stone-300"
                        />
                        Afficher à l’accueil
                      </label>
                    </div>
                    {article ? (
                      <div className="border-t border-stone-200 pt-6">
                        <DeleteArticleButton
                          id={article.id}
                          title={article.title}
                          redirectAfterDelete={articlesIndexHref}
                        />
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>
            </div>
            <div className="shrink-0 border-t border-stone-200 px-5 py-4">
              <Link
                href={articlesIndexHref}
                className="inline-flex w-full items-center justify-center rounded-lg border border-stone-200 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-stone-600 hover:bg-stone-50"
              >
                Quitter l’éditeur
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </form>
  );
}

function CoverCropPreview({
  coverImageUrl,
  coverFocusX,
  coverFocusY,
  setCoverFocusX,
  setCoverFocusY,
}: {
  coverImageUrl: string;
  coverFocusX: number;
  coverFocusY: number;
  setCoverFocusX: (n: number) => void;
  setCoverFocusY: (n: number) => void;
}) {
  const passthroughLoader: ImageLoader = ({ src }) => src;
  const coverPreviewRef = useRef<HTMLDivElement>(null);

  function applyCropFromClient(clientX: number, clientY: number) {
    const el = coverPreviewRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    const x = ((clientX - r.left) / r.width) * 100;
    const y = ((clientY - r.top) / r.height) * 100;
    setCoverFocusX(Math.min(100, Math.max(0, x)));
    setCoverFocusY(Math.min(100, Math.max(0, y)));
  }

  return (
    <div
      ref={coverPreviewRef}
      className={`relative mt-4 aspect-[4/3] w-full max-w-sm overflow-hidden rounded-xl bg-stone-200 ring-1 ring-stone-300/60 touch-none select-none ${
        coverImageUrl.trim() ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      onMouseDown={(e) => {
        if (!coverImageUrl.trim() || e.button !== 0) return;
        e.preventDefault();
        const move = (ev: MouseEvent) => {
          if ((ev.buttons & 1) === 0) return;
          applyCropFromClient(ev.clientX, ev.clientY);
        };
        const up = () => {
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", up);
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
      }}
      onTouchStart={() => {
        if (!coverImageUrl.trim()) return;
        const move = (ev: TouchEvent) => {
          ev.preventDefault();
          const t2 = ev.touches[0];
          if (t2) applyCropFromClient(t2.clientX, t2.clientY);
        };
        const end = () => {
          document.removeEventListener("touchmove", move);
          document.removeEventListener("touchend", end);
          document.removeEventListener("touchcancel", end);
        };
        document.addEventListener("touchmove", move, { passive: false });
        document.addEventListener("touchend", end);
        document.addEventListener("touchcancel", end);
      }}
    >
      {coverImageUrl.trim() ? (
        <Image
          loader={passthroughLoader}
          unoptimized
          src={coverImageUrl.trim()}
          alt=""
          fill
          className="pointer-events-none object-cover"
          draggable={false}
          style={{ objectPosition: `${coverFocusX}% ${coverFocusY}%` }}
          sizes="(max-width: 640px) 384px, 384px"
        />
      ) : (
        <div className="flex h-full min-h-[120px] items-center justify-center px-4 text-center text-xs text-stone-500">
          Ajoutez une image de couverture.
        </div>
      )}
    </div>
  );
}
