import Link from "next/link";
import { site } from "@/lib/content/site";

export type FooterCategory = { slug: string; title: string };

export function Footer({ categories }: { categories: FooterCategory[] }) {
  const menuSansRevue = categories.filter((c) => c.slug !== "la-revue");
  const colA = menuSansRevue.slice(0, 3);
  const colB = menuSansRevue.slice(3, 6);
  const laRevue = categories.find((c) => c.slug === "la-revue");
  return (
    <footer className="border-t border-black/[0.08] bg-white">
      <div className="mx-auto grid max-w-6xl gap-14 py-16 pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))] md:grid-cols-12 md:gap-10 md:px-10 lg:gap-12">
        <div className="md:col-span-3">
          <p className="font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.28em] text-[#6b6b6b]">
            Qui sommes-nous
          </p>
          <p className="mt-4 font-[family-name:var(--font-serif)] text-lg text-[#0a0a0a]">{site.name}</p>
          <p className="mt-3 font-[family-name:var(--font-sans)] text-sm leading-relaxed text-[#5a5a5a]">
            {site.officialTitle}. Un média dédié à l’actualité et à l’art de vivre du Faubourg Saint-Honoré.
          </p>
          <Link
            href="/#intro"
            className="mt-4 inline-flex min-h-11 items-center font-[family-name:var(--font-sans)] text-[11px] uppercase tracking-[0.2em] text-[#0a0a0a] underline decoration-black/20 underline-offset-4 hover:decoration-black/45 md:min-h-0"
          >
            En savoir plus
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-8 md:col-span-4 lg:col-span-4">
          <div>
            <p className="font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.28em] text-[#6b6b6b]">
              Rubriques
            </p>
            <ul className="mt-4 space-y-3">
              {colA.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/${r.slug}`}
                    className="inline-flex min-h-11 items-center font-[family-name:var(--font-sans)] text-sm text-[#0a0a0a] transition-opacity hover:opacity-55 md:min-h-0"
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
                    className="inline-flex min-h-11 items-center font-[family-name:var(--font-sans)] text-sm text-[#0a0a0a] transition-opacity hover:opacity-55 md:min-h-0"
                  >
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="md:col-span-2">
          <p className="font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.28em] text-[#6b6b6b]">
            Médias
          </p>
          <ul className="mt-4 space-y-3">
            {laRevue ? (
              <li>
                <Link
                  href={`/${laRevue.slug}`}
                  className="inline-flex min-h-11 items-center font-[family-name:var(--font-sans)] text-sm text-[#0a0a0a] transition-opacity hover:opacity-55 md:min-h-0"
                >
                  {laRevue.title}
                </Link>
              </li>
            ) : null}
            <li>
              <Link
                href={site.mediaKitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center font-[family-name:var(--font-sans)] text-sm text-[#0a0a0a] transition-opacity hover:opacity-55 md:min-h-0"
              >
                Le Media-kit
              </Link>
            </li>
          </ul>
        </div>

        <div className="md:col-span-3">
          <p className="font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.28em] text-[#6b6b6b]">
            Rejoignez-nous
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1 font-[family-name:var(--font-sans)] text-sm text-[#0a0a0a] md:gap-y-3">
            <li>
              <Link
                href={site.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center transition-opacity hover:opacity-55 md:min-h-0"
              >
                Instagram
              </Link>
            </li>
            <li>
              <Link
                href={site.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center transition-opacity hover:opacity-55 md:min-h-0"
              >
                Youtube
              </Link>
            </li>
            <li>
              <Link
                href={site.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center transition-opacity hover:opacity-55 md:min-h-0"
              >
                X
              </Link>
            </li>
            <li>
              <Link
                href={site.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center transition-opacity hover:opacity-55 md:min-h-0"
              >
                Facebook
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-black/[0.06] bg-[#fafafa] py-6 pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] md:px-6 md:pb-6">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center font-[family-name:var(--font-sans)] text-[10px] uppercase tracking-[0.24em] text-[#8a8a8a]">
          <span>
            © {new Date().getFullYear()} {site.name}
          </span>
          <span className="text-black/20" aria-hidden>
            |
          </span>
          <span className="tracking-[0.22em]">
            Propulsé par{" "}
            {site.studioCredit.url ? (
              <Link
                href={site.studioCredit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0a0a0a] transition-opacity hover:opacity-60"
              >
                {site.studioCredit.label}
              </Link>
            ) : (
              <span className="font-medium text-[#0a0a0a]">{site.studioCredit.label}</span>
            )}
          </span>
        </p>
      </div>
    </footer>
  );
}
