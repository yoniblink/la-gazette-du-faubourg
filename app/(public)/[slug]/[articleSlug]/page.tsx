import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getPublishedArticleBySlugs } from "@/lib/data/articles";
import { ArticleBody } from "@/components/ArticleBody";
import { site } from "@/lib/content/site";

type Props = { params: Promise<{ slug: string; articleSlug: string }> };

export const dynamicParams = true;
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, articleSlug } = await params;
  const article = await getPublishedArticleBySlugs(slug, articleSlug);
  if (!article) return {};
  const title = article.seoTitle?.trim() || article.title;
  const description = article.seoDescription?.trim() || article.excerpt;
  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${site.name}`,
      description,
      locale: "fr_FR",
      images: article.coverImageUrl ? [{ url: article.coverImageUrl }] : undefined,
    },
  };
}

export default async function RubriqueArticlePage({ params }: Props) {
  const { slug, articleSlug } = await params;
  const rubrique = await getCategoryBySlug(slug);
  const article = await getPublishedArticleBySlugs(slug, articleSlug);
  if (!rubrique || !article) notFound();

  const sourceUrl = article.sourceUrl?.trim();

  return (
    <main className="bg-[#fafafa] pb-24 pt-20 md:pb-32 md:pt-28">
      <article className="mx-auto max-w-3xl px-6 md:px-10">
        <nav className="font-[family-name:var(--font-sans)] text-[10px] uppercase tracking-[0.24em] text-[#7a7a7a]">
          <Link href="/" className="transition-opacity hover:opacity-60">
            Accueil
          </Link>
          <span className="mx-2 text-[#c9c9c9]">/</span>
          <Link href={`/${slug}`} className="transition-opacity hover:opacity-60">
            {rubrique.title}
          </Link>
          <span className="mx-2 text-[#c9c9c9]">/</span>
          <span className="text-[#0a0a0a] line-clamp-1">{article.title}</span>
        </nav>

        <header className="mt-10">
          {article.kicker ? (
            <p className="font-[family-name:var(--font-sans)] text-[10px] font-medium uppercase tracking-[0.32em] text-[#6b6b6b]">
              {article.kicker}
            </p>
          ) : null}
          <h1 className="mt-3 font-[family-name:var(--font-serif)] text-[clamp(1.85rem,4vw,2.65rem)] font-light leading-[1.12] tracking-tight text-[#0a0a0a]">
            {article.title}
          </h1>
          <p className="mt-5 font-[family-name:var(--font-sans)] text-[15px] leading-[1.75] text-[#4a4a4a]">
            {article.excerpt}
          </p>
          {article.publishedAt ? (
            <p className="mt-3 font-[family-name:var(--font-sans)] text-[11px] uppercase tracking-[0.18em] text-[#8a8a8a]">
              {article.publishedAt.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {article.authorName ? ` · ${article.authorName}` : null}
            </p>
          ) : null}
        </header>

        <div className="relative mt-12 aspect-[16/10] min-h-[11rem] w-full overflow-hidden bg-[#eaeaea] md:aspect-[2/1] md:min-h-[14rem]">
          <Image
            src={article.coverImageUrl}
            alt={article.coverImageAlt}
            fill
            priority
            sizes="(max-width:768px) 100vw, 48rem"
            className="object-cover"
            style={{ objectPosition: article.coverObjectPosition }}
          />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.06]" />
        </div>

        <ArticleBody content={article.content as object} />

        <footer className="mt-16 border-t border-black/[0.08] pt-10">
          {sourceUrl ? (
            <p className="font-[family-name:var(--font-sans)] text-sm text-[#5a5a5a]">
              Version publiée également sur le{" "}
              <Link
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-black/20 underline-offset-4 hover:decoration-black/50"
              >
                site de La Gazette du Faubourg
              </Link>
              .
            </p>
          ) : null}
          <Link
            href={`/${slug}`}
            className="mt-6 inline-flex font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.22em] text-[#0a0a0a] transition-opacity hover:opacity-60"
          >
            ← Retour à {rubrique.title}
          </Link>
        </footer>
      </article>
    </main>
  );
}
