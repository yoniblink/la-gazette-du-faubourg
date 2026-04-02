"use client";

import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/content/site";

export type FooterCategory = { slug: string; title: string };

const FOOTER_BG = "#272626";
/** Rubriques / contact : `Helvetica` dans Elementor ; repli sur Roboto du thème. */
const footerSans =
  'Helvetica, Arial, ui-sans-serif, system-ui, "Roboto", sans-serif';

function publicRubriqueHref(slug: string) {
  return slug === "actualite" ? "/actualites" : `/${slug}`;
}

function FooterSocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex text-white transition-colors hover:text-[#CED0C3]"
    >
      {children}
    </Link>
  );
}

export function Footer({ categories }: { categories: FooterCategory[] }) {
  const menuSansRevue = categories.filter((c) => c.slug !== "la-revue");
  const colA = menuSansRevue.slice(0, 3);
  const colB = menuSansRevue.slice(3, 6);
  const laRevue = categories.find((c) => c.slug === "la-revue");

  const headingSerifClass =
    "text-[28px] font-normal leading-[1.3] text-white max-lg:text-2xl max-lg:leading-[1.3]";

  return (
    <footer
      id="colophon"
      className="text-white"
      style={{ backgroundColor: FOOTER_BG }}
    >
      <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-[30px] px-[15px] pb-[20px] pt-[50px] lg:gap-[30px] lg:px-[15px] lg:pb-[67px] lg:pt-[70px] xl:px-8 xl:pb-[67px] xl:pt-[100px]">
        <div className="pb-5 lg:pb-5">
          <Link
            href="/"
            className="inline-block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/40"
          >
            <Image
              src="/logo-gazette-footer-blanc.png"
              alt={site.name}
              width={250}
              height={71}
              className="h-auto w-[250px] max-w-full"
              sizes="250px"
            />
          </Link>
        </div>

        {/* Colonnes (Elementor 6160627) */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-6 xl:gap-x-10">
          {/* Contact — ~33 % */}
          <div className="lg:col-span-4">
            <h4
              className={`${headingSerifClass} mb-0 pb-2.5`}
              style={{ fontFamily: '"Garamond Italic", Garamond, ui-serif, Georgia, serif' }}
            >
              Contact
            </h4>
            <ul
              className="space-y-0"
              style={{ fontFamily: footerSans }}
            >
              <li className="py-[3px]">
                <a
                  href={`mailto:${site.emailRedaction}`}
                  className="text-[15px] font-normal uppercase text-white transition-colors hover:text-[#CED0C3] max-lg:text-[13px]"
                >
                  Contact rédaction
                </a>
              </li>
              <li className="py-[3px]">
                <a
                  href={`mailto:${site.emailAnnonceurs}`}
                  className="text-[15px] font-normal uppercase text-white transition-colors hover:text-[#CED0C3] max-lg:text-[13px]"
                >
                  Contact annonceurs
                </a>
              </li>
              <li className="py-[3px]">
                <a
                  href={`mailto:${site.emailPartenariats}`}
                  className="text-[15px] font-normal uppercase text-white transition-colors hover:text-[#CED0C3] max-lg:text-[13px]"
                >
                  Contact partenariats
                </a>
              </li>
              <li className="py-[3px]">
                <Link
                  href="/qui-sommes-nous"
                  className="text-[15px] font-normal uppercase text-white transition-colors hover:text-[#CED0C3] max-lg:text-[13px]"
                >
                  Qui sommes nous
                </Link>
              </li>
            </ul>
          </div>

          {/* Rubriques — deux sous-colonnes */}
          <div className="sm:col-span-2 lg:col-span-4">
            <h4
              className={`${headingSerifClass} mb-0 pb-2.5`}
              style={{ fontFamily: '"Garamond Italic", Garamond, ui-serif, Georgia, serif' }}
            >
              Rubriques
            </h4>
            <div className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
              <ul className="space-y-0" style={{ fontFamily: footerSans }}>
                {colA.map((r) => (
                  <li key={r.slug} className="py-[3px]">
                    <Link
                      href={publicRubriqueHref(r.slug)}
                      className="text-[15px] font-normal leading-[1.2] text-white transition-colors hover:text-[#CED0C3] max-lg:text-[13px]"
                    >
                      {r.slug === "actualite" ? "Actualités" : r.title}
                    </Link>
                  </li>
                ))}
              </ul>
              <ul className="space-y-0 max-sm:mt-1" style={{ fontFamily: footerSans }}>
                {colB.map((r) => (
                  <li key={r.slug} className="py-[3px]">
                    <Link
                      href={publicRubriqueHref(r.slug)}
                      className="text-[15px] font-normal leading-[1.2] text-white transition-colors hover:text-[#CED0C3] max-lg:text-[13px]"
                    >
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Médias */}
          <div className="lg:col-span-2">
            <h4
              className={`${headingSerifClass} mb-0 pb-2.5`}
              style={{ fontFamily: '"Garamond Italic", Garamond, ui-serif, Georgia, serif' }}
            >
              Médias
            </h4>
            <ul className="space-y-0" style={{ fontFamily: footerSans }}>
              {laRevue ? (
                <li className="py-[3px]">
                  <Link
                    href={publicRubriqueHref(laRevue.slug)}
                    className="text-[15px] font-normal leading-[1.2] text-white transition-colors hover:text-[#CED0C3] max-lg:text-[13px]"
                  >
                    {laRevue.title}
                  </Link>
                </li>
              ) : null}
              <li className="py-[3px]">
                <Link
                  href="/le-media-kit"
                  className="text-[15px] font-normal leading-[1.2] text-white transition-colors hover:text-[#CED0C3] max-lg:text-[13px]"
                >
                  Le Media-kit
                </Link>
              </li>
            </ul>
          </div>

          {/* Rejoignez-nous */}
          <div className="lg:col-span-2">
            <h4
              className={`${headingSerifClass} mb-0 pb-2.5`}
              style={{ fontFamily: '"Garamond Italic", Garamond, ui-serif, Georgia, serif' }}
            >
              Rejoignez-nous
            </h4>
            <div className="-ml-2.5 flex flex-wrap items-center gap-x-1 gap-y-2">
              <FooterSocialLink href={site.instagramUrl} label={site.instagramLabel}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={19}
                  height={19}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </FooterSocialLink>
              <FooterSocialLink href={site.youtubeUrl} label="YouTube">
                <svg xmlns="http://www.w3.org/2000/svg" width={19} height={19} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </FooterSocialLink>
              <FooterSocialLink href={site.twitterUrl} label="X">
                <svg xmlns="http://www.w3.org/2000/svg" width={19} height={19} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                </svg>
              </FooterSocialLink>
              <FooterSocialLink href={site.facebookUrl} label="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width={19} height={19} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </FooterSocialLink>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
