import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeFlipbook } from "@/components/sections/HomeFlipbook";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getPublishedArticlesByCategorySlug } from "@/lib/data/articles";
import { site } from "@/lib/content/site";
import { hasDatabaseUrl } from "@/lib/prisma";
import { getHomeFlipbookManifest, getHomeFlipbookPdfUrl } from "@/lib/site-settings";

const LA_REVUE_SLUG = "la-revue";
const ACTUALITE_DB_SLUG = "actualite";
const ACTUALITES_PUBLIC_SLUG = "actualites";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = slug === ACTUALITES_PUBLIC_SLUG ? ACTUALITE_DB_SLUG : slug;
  const rubrique = await getCategoryBySlug(normalizedSlug);
  if (!rubrique) return {};
  const rubriqueTitle = rubrique.slug === ACTUALITE_DB_SLUG ? "Actualités" : rubrique.title;
  return {
    title: `${rubriqueTitle} | ${site.name}`,
    description: rubrique.description,
    openGraph: {
      title: `${rubriqueTitle} | ${site.name}`,
      description: rubrique.description,
      locale: "fr_FR",
    },
  };
}

export default async function RubriquePage({ params }: Props) {
  const { slug } = await params;
  const normalizedSlug = slug === ACTUALITES_PUBLIC_SLUG ? ACTUALITE_DB_SLUG : slug;
  const rubrique = await getCategoryBySlug(normalizedSlug);
  if (!rubrique) notFound();

  const articles = await getPublishedArticlesByCategorySlug(normalizedSlug);
  const rubriqueTitle = rubrique.slug === ACTUALITE_DB_SLUG ? "Actualités" : rubrique.title;

  const isLaRevue = slug === LA_REVUE_SLUG;
  const flipbookPdfUrl =
    isLaRevue && hasDatabaseUrl() ? await getHomeFlipbookPdfUrl() : null;
  const flipbookManifest =
    isLaRevue && hasDatabaseUrl() ? await getHomeFlipbookManifest() : null;

  return (
    <main className="bg-white pt-14 pb-24 md:pt-16 md:pb-32">
      <header className="w-full bg-black px-4 py-14 md:px-6 md:py-20">
        <h1
          className="text-center font-['Griffiths'] text-[clamp(1.65rem,3.8vw,2.65rem)] font-normal italic leading-tight tracking-normal text-white"
          style={{
            fontFamily: '"Griffiths", "Garamond Italic", Garamond, Georgia, serif',
          }}
        >
          {rubriqueTitle}
        </h1>
      </header>
      <article className="mx-auto max-w-6xl px-6 pb-0 pt-12 md:px-10 md:pt-16">
        {isLaRevue && flipbookPdfUrl ? (
          <HomeFlipbook
            pdfUrl={flipbookPdfUrl}
            initialManifest={flipbookManifest}
            embedded
          />
        ) : null}

        <section className="mt-16 md:mt-24">
          <ul className="divide-y divide-black/[0.06]">
            {articles.length === 0 ? (
              <li className="py-12 font-[family-name:var(--font-sans)] text-sm text-[#5a5a5a]">
                Aucun article publié dans cette rubrique pour le moment.
              </li>
            ) : (
              articles.map((a) => (
                <li key={a.id} className="py-12 md:py-16 first:pt-0">
                  <Link
                    href={`/${a.category.slug === ACTUALITE_DB_SLUG ? ACTUALITES_PUBLIC_SLUG : a.category.slug}/${a.slug}`}
                    className="group grid grid-cols-1 items-center gap-10 md:grid-cols-12 md:gap-12 lg:gap-16"
                  >
                    <div className="md:col-span-6 lg:col-span-7">
                      <div
                        className="relative aspect-[4/3] min-h-[12rem] w-full overflow-hidden rounded-2xl bg-[#e8e6e2] shadow-[0_10px_40px_rgba(10,10,10,0.07),inset_0_0_0_1px_rgba(10,10,10,0.05)] ring-1 ring-inset ring-black/[0.04] transition-[transform,box-shadow,ring-color] duration-[1.8s] ease-[cubic-bezier(0.33,1,0.32,1)] will-change-transform [perspective:1400px] [perspective-origin:50%_50%] group-hover:-translate-y-1.5 group-hover:shadow-[0_28px_60px_rgba(10,10,10,0.14),0_0_0_1px_rgba(184,154,98,0.22),inset_0_1px_0_rgba(255,255,255,0.35)] group-hover:ring-[#c4a574]/35 motion-reduce:transition-none motion-reduce:will-change-auto motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:shadow-[0_10px_40px_rgba(10,10,10,0.07),inset_0_0_0_1px_rgba(10,10,10,0.05)] motion-reduce:group-hover:ring-black/[0.04]"
                      >
                        {/* Couche 3D : zoom « caméra qui avance » (translateZ + scale) */}
                        <div
                          className="absolute inset-0 origin-center [backface-visibility:hidden] [transform:translateZ(0)_scale(1)] [transform-style:preserve-3d] transition-[transform] duration-[2.9s] ease-[cubic-bezier(0.33,1,0.32,1)] will-change-transform group-hover:[transform:translateZ(42px)_scale(1.14)] motion-reduce:transition-none motion-reduce:will-change-auto motion-reduce:group-hover:[transform:translateZ(0)_scale(1)]"
                        >
                          <Image
                            src={a.coverImageUrl}
                            alt={a.coverImageAlt}
                            fill
                            sizes="(max-width:768px) 100vw, (max-width:1024px) 50vw, 58vw"
                            className="object-cover"
                            style={{ objectPosition: a.coverObjectPosition }}
                          />
                        </div>
                        {/* Profondeur et highlight façon vitrine */}
                        <div
                          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.18] via-black/[0.02] to-transparent opacity-40 transition-opacity duration-[1.65s] ease-[cubic-bezier(0.33,1,0.32,1)] group-hover:opacity-100"
                          aria-hidden
                        />
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col justify-center md:col-span-6 lg:col-span-5">
                      <h3 className="font-[family-name:var(--font-serif)] text-[clamp(1.6rem,3.4vw,2.75rem)] font-light italic leading-[1.15] tracking-[-0.02em] text-[#0a0a0a]">
                        {a.title}
                      </h3>
                      {a.excerpt ? (
                        <p className="mt-5 max-w-xl font-[family-name:var(--font-serif)] text-[15px] font-light leading-[1.85] text-[#3a3a3a] md:text-[1.0625rem] md:leading-[1.8]">
                          {a.excerpt}
                        </p>
                      ) : null}
                      <span className="mt-6 inline-flex w-fit font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.2em] text-[#0a0a0a] underline decoration-black/20 underline-offset-[6px] transition-colors group-hover:decoration-black/55">
                        Lire la suite
                      </span>
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </article>
    </main>
  );
}
