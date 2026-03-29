import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getPublishedArticlesByCategorySlug } from "@/lib/data/articles";
import { site } from "@/lib/content/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const rubrique = await getCategoryBySlug(slug);
  if (!rubrique) return {};
  return {
    title: `${rubrique.title} | ${site.name}`,
    description: rubrique.description,
    openGraph: {
      title: `${rubrique.title} | ${site.name}`,
      description: rubrique.description,
      locale: "fr_FR",
    },
  };
}

export default async function RubriquePage({ params }: Props) {
  const { slug } = await params;
  const rubrique = await getCategoryBySlug(slug);
  if (!rubrique) notFound();

  const articles = await getPublishedArticlesByCategorySlug(slug);

  return (
    <main className="bg-[#fafafa] pb-24 pt-20 md:pb-32 md:pt-28">
      <article className="mx-auto max-w-6xl px-6 md:px-10">
        <nav className="font-[family-name:var(--font-sans)] text-[10px] uppercase tracking-[0.24em] text-[#7a7a7a]">
          <Link href="/" className="transition-opacity hover:opacity-60">
            Accueil
          </Link>
          <span className="mx-2 text-[#c9c9c9]">/</span>
          <span className="text-[#0a0a0a]">{rubrique.title}</span>
        </nav>

        <header className="mt-10 grid gap-10 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            <p className="font-[family-name:var(--font-sans)] text-[10px] font-medium uppercase tracking-[0.28em] text-[#6b6b6b]">
              Rubrique
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-serif)] text-[clamp(2rem,4vw,3rem)] font-light leading-tight text-[#0a0a0a]">
              {rubrique.title}
            </h1>
            <p className="mt-4 font-[family-name:var(--font-sans)] text-sm uppercase tracking-[0.18em] text-[#6b6b6b]">
              {rubrique.tagline}
            </p>
          </div>
          <p className="font-[family-name:var(--font-sans)] text-[15px] leading-[1.8] text-[#3a3a3a] md:col-span-6 md:col-start-7">
            {rubrique.description}
          </p>
        </header>

        <div className="relative mt-14 aspect-[21/10] w-full overflow-hidden bg-[#eaeaea] md:mt-16 md:aspect-[2.4/1]">
          <Image
            src={rubrique.imageSrc}
            alt={rubrique.imageAlt}
            fill
            priority
            sizes="(max-width:768px) 100vw, 1200px"
            className="object-cover"
          />
        </div>

        <section className="mt-16 border-t border-black/[0.08] pt-14 md:mt-20 md:pt-16">
          <h2 className="font-[family-name:var(--font-serif)] text-2xl font-light text-[#0a0a0a]">
            Pistes de lecture
          </h2>
          <ul className="mt-8 space-y-6">
            {articles.length === 0 ? (
              <li className="font-[family-name:var(--font-sans)] text-sm text-[#5a5a5a]">
                Aucun article publié dans cette rubrique pour le moment.
              </li>
            ) : (
              articles.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/${slug}/${a.slug}`}
                    className="group flex flex-col gap-2 border-b border-black/[0.06] pb-6 transition-opacity hover:opacity-70 md:flex-row md:items-start md:justify-between md:gap-8"
                  >
                    <div className="min-w-0 md:max-w-2xl">
                      <span className="block font-[family-name:var(--font-serif)] text-lg text-[#0a0a0a]">
                        {a.title}
                      </span>
                      {a.excerpt ? (
                        <p className="mt-2 font-[family-name:var(--font-sans)] text-sm leading-relaxed text-[#5a5a5a]">
                          {a.excerpt}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 font-[family-name:var(--font-sans)] text-[10px] uppercase tracking-[0.2em] text-[#7a7a7a] md:pt-0.5">
                      {a.category.title}
                      <span className="ml-2 inline-block transition-transform group-hover:translate-x-0.5">→</span>
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <p className="mt-14 font-[family-name:var(--font-sans)] text-sm text-[#5a5a5a]">
          Pour l’ensemble des articles : consultez le{" "}
          <Link
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-black/20 underline-offset-4 hover:decoration-black/50"
          >
            magazine en ligne
          </Link>
          .
        </p>
      </article>
    </main>
  );
}
