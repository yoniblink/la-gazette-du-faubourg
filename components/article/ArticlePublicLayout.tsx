"use client";

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

/**
 * Même structure que la page publique article — utilisé par le site et l’aperçu éditeur.
 */
export function ArticlePublicLayout({
  categorySlug,
  categoryTitle,
  title,
  kicker: _kicker,
  excerpt: _excerpt,
  publishedAt: _publishedAt,
  authorName: _authorName,
  coverImageUrl,
  coverImageAlt,
  coverObjectPosition,
  sourceUrl: _sourceUrl,
  children,
  inlineEdit,
}: ArticlePublicLayoutProps) {
  const showCover = coverImageUrl.trim().length > 0;
  /** Page publique : pas de grande image de couverture (le corps contient déjà les visuels). */
  const showCoverBlock = Boolean(inlineEdit);

  const mainPad = inlineEdit
    ? "pb-12 pt-6 md:pb-16 md:pt-8"
    : "pb-24 pt-20 md:pb-32 md:pt-28";

  return (
    <main className={`flex flex-1 flex-col bg-[#fafafa] ${mainPad}`}>
      <article className="mx-auto max-w-3xl px-6 md:px-10">
        <h1 className="sr-only">{title}</h1>

        {showCoverBlock ? (
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
        ) : null}

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
