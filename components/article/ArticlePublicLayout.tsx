"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

export type ArticleInlineEditProps = {
  onTitleChange: (value: string) => void;
  onKickerChange: (value: string) => void;
  onExcerptChange: (value: string) => void;
  onRequestCoverSettings?: () => void;
};

export type ArticlePublicLayoutProps = {
  categorySlug: string;
  categoryTitle: string;
  title: string;
  kicker?: string;
  excerpt: string;
  publishedAt: Date | null;
  authorName?: string;
  coverImageUrl: string;
  coverImageAlt: string;
  coverObjectPosition: string;
  sourceUrl?: string;
  children: React.ReactNode;
  /** Édition sur la page : mêmes styles que le site, champs modifiables au clavier. */
  inlineEdit?: ArticleInlineEditProps;
};

function EditableTitle({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (el.textContent !== value) el.textContent = value;
  }, [value]);

  return (
    <h1
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`${className} outline-none ring-offset-2 transition-shadow focus-visible:ring-2 focus-visible:ring-rose-400/40`}
      onBlur={(e) => onChange(e.currentTarget.textContent?.trim() ?? "")}
    />
  );
}

function EditableKicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (el.textContent !== value) el.textContent = value;
  }, [value]);

  return (
    <p
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`${className} min-h-[1.1em] outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40`}
      onBlur={(e) => onChange(e.currentTarget.textContent?.trim() ?? "")}
    />
  );
}

function EditableExcerpt({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (el.textContent !== value) el.textContent = value;
  }, [value]);

  return (
    <p
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline
      className={`${className} min-h-[4.5rem] outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40`}
      onBlur={(e) => onChange(e.currentTarget.textContent?.trim() ?? "")}
    />
  );
}

/**
 * Même structure que la page publique article — utilisé par le site et l’aperçu éditeur.
 */
export function ArticlePublicLayout({
  categorySlug,
  categoryTitle,
  title,
  kicker,
  excerpt,
  publishedAt,
  authorName,
  coverImageUrl,
  coverImageAlt,
  coverObjectPosition,
  sourceUrl,
  children,
  inlineEdit,
}: ArticlePublicLayoutProps) {
  const showCover = coverImageUrl.trim().length > 0;
  const showMetaLine = publishedAt != null || Boolean(inlineEdit);

  const mainPad = inlineEdit
    ? "pb-12 pt-6 md:pb-16 md:pt-8"
    : "pb-24 pt-20 md:pb-32 md:pt-28";

  return (
    <main className={`bg-[#fafafa] ${mainPad}`}>
      <article className="mx-auto max-w-3xl px-6 md:px-10">
        <nav className="font-[family-name:var(--font-sans)] text-[10px] uppercase tracking-[0.24em] text-[#7a7a7a]">
          <Link href="/" className="transition-opacity hover:opacity-60">
            Accueil
          </Link>
          <span className="mx-2 text-[#c9c9c9]">/</span>
          <Link href={`/${categorySlug}`} className="transition-opacity hover:opacity-60">
            {categoryTitle}
          </Link>
          <span className="mx-2 text-[#c9c9c9]">/</span>
          <span className="line-clamp-1 text-[#0a0a0a]">{title}</span>
        </nav>

        <header className="mt-10">
          {inlineEdit ? (
            <EditableKicker
              value={kicker ?? ""}
              onChange={inlineEdit.onKickerChange}
              className="font-[family-name:var(--font-sans)] text-[10px] font-medium uppercase tracking-[0.32em] text-[#6b6b6b]"
            />
          ) : kicker?.trim() ? (
            <p className="font-[family-name:var(--font-sans)] text-[10px] font-medium uppercase tracking-[0.32em] text-[#6b6b6b]">
              {kicker}
            </p>
          ) : null}
          {inlineEdit ? (
            <EditableTitle
              value={title}
              onChange={inlineEdit.onTitleChange}
              className="mt-3 font-[family-name:var(--font-serif)] text-[clamp(1.85rem,4vw,2.65rem)] font-light leading-[1.12] tracking-tight text-[#0a0a0a]"
            />
          ) : (
            <h1 className="mt-3 font-[family-name:var(--font-serif)] text-[clamp(1.85rem,4vw,2.65rem)] font-light leading-[1.12] tracking-tight text-[#0a0a0a]">
              {title}
            </h1>
          )}
          {inlineEdit ? (
            <EditableExcerpt
              value={excerpt}
              onChange={inlineEdit.onExcerptChange}
              className="mt-5 font-[family-name:var(--font-sans)] text-[15px] leading-[1.75] text-[#4a4a4a]"
            />
          ) : (
            <p className="mt-5 font-[family-name:var(--font-sans)] text-[15px] leading-[1.75] text-[#4a4a4a]">
              {excerpt}
            </p>
          )}
          {showMetaLine ? (
            <p className="mt-3 font-[family-name:var(--font-sans)] text-[11px] uppercase tracking-[0.18em] text-[#8a8a8a]">
              {publishedAt
                ? publishedAt.toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Brouillon"}
              {authorName?.trim() ? ` · ${authorName}` : null}
            </p>
          ) : null}
        </header>

        <div
          className={`relative mt-12 aspect-[16/10] min-h-[11rem] w-full overflow-hidden bg-[#eaeaea] md:aspect-[2/1] md:min-h-[14rem] ${inlineEdit?.onRequestCoverSettings ? "group/cover" : ""}`}
        >
          {showCover ? (
            <>
              <Image
                src={coverImageUrl.trim()}
                alt={coverImageAlt || ""}
                fill
                priority
                sizes="(max-width:768px) 100vw, 48rem"
                className="object-cover"
                style={{ objectPosition: coverObjectPosition }}
              />
              <div className="pointer-events-none absolute inset-0 z-[1] ring-1 ring-inset ring-black/[0.06]" />
            </>
          ) : (
            <div className="flex h-full min-h-[11rem] items-center justify-center font-[family-name:var(--font-sans)] text-sm text-[#8a8a8a]">
              Image de couverture (réglages)
            </div>
          )}
          {inlineEdit?.onRequestCoverSettings ? (
            <button
              type="button"
              onClick={inlineEdit.onRequestCoverSettings}
              className="absolute inset-0 z-[2] flex items-center justify-center bg-black/0 opacity-0 transition group-hover/cover:bg-black/25 group-hover/cover:opacity-100"
              aria-label="Ouvrir les réglages de couverture"
            >
              <span className="rounded-full border border-black/10 bg-white/95 px-4 py-2 font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-wider text-[#0a0a0a] shadow-sm">
                Couverture — réglages
              </span>
            </button>
          ) : null}
        </div>

        {children}

        {inlineEdit ? null : (
          <footer className="mt-16 border-t border-black/[0.08] pt-10">
            <Link
              href={`/${categorySlug}`}
              className="mt-6 inline-flex font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.22em] text-[#0a0a0a] transition-opacity hover:opacity-60"
            >
              ← Retour à {categoryTitle}
            </Link>
          </footer>
        )}
      </article>
    </main>
  );
}
