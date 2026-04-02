"use client";

import Link from "next/link";

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
};

/**
 * Même structure que la page publique article — utilisé par le site et l’aperçu éditeur (sans écart visuel).
 */
export function ArticlePublicLayout(props: ArticlePublicLayoutProps) {
  const {
    categorySlug,
    categoryTitle,
    title,
    children,
    articleSurface = "default",
  } = props;

  const mainPad =
    "pb-24 pt-20 max-[768px]:pb-16 max-[768px]:pt-[4.5rem] max-[1024px]:pb-20 max-[1024px]:pt-24 md:pb-32 md:pt-28";

  const isMagazine = articleSurface === "magazine-column";
  const mainBg = isMagazine ? "bg-white" : "bg-[#fafafa]";
  const articleMax = isMagazine
    ? "max-w-[42rem] px-5 max-[768px]:px-4 md:px-6"
    : "max-w-[1140px] px-5 max-[768px]:px-4 md:px-8 lg:px-10";

  return (
    <main className={`flex flex-1 flex-col ${mainBg} ${mainPad}`}>
      <article className={`mx-auto w-full ${articleMax}`}>
        <h1 className="sr-only">{title}</h1>

        {children}

        <footer className="mt-16 border-t border-black/[0.08] pt-10 max-[768px]:mt-12 max-[768px]:pt-8">
          <Link
            href={`/${categorySlug}`}
            className="mt-6 inline-flex min-h-[44px] items-center font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.22em] text-[#0a0a0a] transition-opacity hover:opacity-60 max-[768px]:mt-4 max-[768px]:py-2"
          >
            ← Retour à {categoryTitle}
          </Link>
        </footer>
      </article>
    </main>
  );
}
