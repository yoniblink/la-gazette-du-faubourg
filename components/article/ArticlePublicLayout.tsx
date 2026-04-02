"use client";

import { ZoomableImage } from "@/components/ui/ZoomableImage";
import Link from "next/link";

export type ArticleInlineEditProps = {
  onTitleChange: (value: string) => void;
  onKickerChange: (value: string) => void;
  onExcerptChange: (value: string) => void;
  onRequestCoverSettings?: () => void;
};

export type ArticleSurfaceVariant = "default" | "magazine-column";

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
  /** Colonne étroite, fond blanc (articles « magazine »). */
  articleSurface?: ArticleSurfaceVariant;
  /** Édition sur la page : mêmes styles que le site, champs modifiables au clavier. */
  inlineEdit?: ArticleInlineEditProps;
};

/**
 * Même structure que la page publique article — utilisé par le site et l’aperçu éditeur.
 */
export function ArticlePublicLayout(props: ArticlePublicLayoutProps) {
  const {
    categorySlug,
    categoryTitle,
    title,
    coverImageUrl,
    coverImageAlt,
    coverObjectPosition,
    children,
    articleSurface = "default",
    inlineEdit,
  } = props;
  const showCover = coverImageUrl.trim().length > 0;
  /** Page publique : pas de grande image de couverture (le corps contient déjà les visuels). */
  const showCoverBlock = Boolean(inlineEdit);

  const mainPad = inlineEdit
    ? "pb-12 pt-6 max-[768px]:pb-10 max-[768px]:pt-5 md:pb-16 md:pt-8"
    : "pb-24 pt-20 max-[768px]:pb-16 max-[768px]:pt-[4.5rem] max-[1024px]:pb-20 max-[1024px]:pt-24 md:pb-32 md:pt-28";

  const isMagazine = articleSurface === "magazine-column" && !inlineEdit;
  const mainBg = isMagazine ? "bg-white" : "bg-[#fafafa]";
  const articleMax = isMagazine
    ? "max-w-[42rem] px-5 max-[768px]:px-4 md:px-6"
    : "max-w-[1140px] px-5 max-[768px]:px-4 md:px-8 lg:px-10";

  return (
    <main className={`flex flex-1 flex-col ${mainBg} ${mainPad}`}>
      <article className={`mx-auto w-full ${articleMax}`}>
        <h1 className="sr-only">{title}</h1>

        {showCoverBlock ? (
          <div
            className={`relative mt-12 aspect-[16/10] min-h-[11rem] w-full overflow-hidden bg-[#eaeaea] md:aspect-[2/1] md:min-h-[14rem] ${inlineEdit?.onRequestCoverSettings ? "group/cover" : ""}`}
          >
            {showCover ? (
              <>
                <ZoomableImage
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
          <footer className="mt-16 border-t border-black/[0.08] pt-10 max-[768px]:mt-12 max-[768px]:pt-8">
            <Link
              href={`/${categorySlug}`}
              className="mt-6 inline-flex min-h-[44px] items-center font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.22em] text-[#0a0a0a] transition-opacity hover:opacity-60 max-[768px]:mt-4 max-[768px]:py-2"
            >
              ← Retour à {categoryTitle}
            </Link>
          </footer>
        )}
      </article>
    </main>
  );
}
