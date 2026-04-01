"use client";

import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/content/site";

export type FooterCategory = { slug: string; title: string };

export function Footer({ categories }: { categories: FooterCategory[] }) {
  const menuSansRevue = categories.filter((c) => c.slug !== "la-revue");
  const colA = menuSansRevue.slice(0, 3);
  const colB = menuSansRevue.slice(3, 6);
  const laRevue = categories.find((c) => c.slug === "la-revue");
  return (
    <footer className="border-t border-white/10 bg-[#202126] text-white">
      <div className="mx-auto grid max-w-6xl gap-14 px-6 py-16 md:grid-cols-12 md:gap-10 md:px-10 lg:gap-12">
        <div className="md:col-span-3">
          <p className="font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.28em] text-white/70">
            Qui sommes-nous
          </p>
          <div className="mt-4">
            <Image
              src={site.navbarLogoMobileSrc}
              alt={site.name}
              width={300}
              height={90}
              className="h-auto w-[min(14rem,75%)] object-contain brightness-0 invert"
              sizes="224px"
            />
          </div>
          <p className="mt-3 font-[family-name:var(--font-sans)] text-sm leading-relaxed text-white/70">
            {site.officialTitle}. Un média dédié à l’actualité et à l’art de vivre du Faubourg Saint-Honoré.
          </p>
          <Link
            href="/qui-sommes-nous"
            className="mt-4 inline-block font-[family-name:var(--font-sans)] text-[11px] uppercase tracking-[0.2em] text-white underline decoration-white/25 underline-offset-4 hover:decoration-white/60"
          >
            En savoir plus
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-8 md:col-span-4 lg:col-span-4">
          <div>
            <p className="font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.28em] text-white/70">
              Rubriques
            </p>
            <ul className="mt-4 space-y-3">
              {colA.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/${r.slug}`}
                    className="font-[family-name:var(--font-sans)] text-sm text-white/90 transition-opacity hover:opacity-65"
                  >
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.28em] text-transparent select-none md:mt-0">
              .
            </p>
            <ul className="mt-4 space-y-3 md:mt-[1.85rem]">
              {colB.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/${r.slug}`}
                    className="font-[family-name:var(--font-sans)] text-sm text-white/90 transition-opacity hover:opacity-65"
                  >
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="md:col-span-2">
          <p className="font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.28em] text-white/70">
            Médias
          </p>
          <ul className="mt-4 space-y-3">
            {laRevue ? (
              <li>
                <Link
                  href={`/${laRevue.slug}`}
                  className="font-[family-name:var(--font-sans)] text-sm text-white/90 transition-opacity hover:opacity-65"
                >
                  {laRevue.title}
                </Link>
              </li>
            ) : null}
            <li>
              <Link
                href="/le-media-kit"
                className="font-[family-name:var(--font-sans)] text-sm text-white/90 transition-opacity hover:opacity-65"
              >
                Le Media-kit
              </Link>
            </li>
          </ul>
        </div>

        <div className="md:col-span-3">
          <p className="font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.28em] text-white/70">
            Rejoignez-nous
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3 font-[family-name:var(--font-sans)] text-sm text-white/90">
            <li>
              <Link
                href={site.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-55"
              >
                Instagram
              </Link>
            </li>
            <li>
              <Link
                href={site.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-55"
              >
                Youtube
              </Link>
            </li>
            <li>
              <Link
                href={site.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-55"
              >
                X
              </Link>
            </li>
            <li>
              <Link
                href={site.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-opacity hover:opacity-55"
              >
                Facebook
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 bg-[#202126] px-6 py-6">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center font-[family-name:var(--font-sans)] text-[10px] uppercase tracking-[0.24em] text-white/55">
          <span>
            © {new Date().getFullYear()} {site.name}
          </span>
          <span className="text-white/25" aria-hidden>
            |
          </span>
          <span className="tracking-[0.22em]">
            Propulsé par{" "}
            {site.studioCredit.url ? (
              <Link
                href={site.studioCredit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/85 transition-opacity hover:opacity-60"
              >
                {site.studioCredit.label}
              </Link>
            ) : (
              <span className="font-medium text-white/85">{site.studioCredit.label}</span>
            )}
          </span>
        </p>
      </div>
    </footer>
  );
}
