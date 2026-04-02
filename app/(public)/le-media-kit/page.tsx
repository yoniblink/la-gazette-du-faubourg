import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/content/site";
import { getMediaKitPdfUrl } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Le media-kit",
  description: `Télécharger le media-kit de ${site.name}.`,
  openGraph: {
    title: `Le media-kit | ${site.name}`,
    description: `Télécharger le media-kit de ${site.name}.`,
    locale: "fr_FR",
  },
  alternates: {
    canonical: "/le-media-kit",
  },
};

export default async function MediaKitPage() {
  const mediaKitUrl = (await getMediaKitPdfUrl()) ?? site.mediaKitUrl;
  return (
    <main className="flex flex-1 flex-col bg-[#f8f8f8] pb-24 pt-20 max-[768px]:pb-16 max-[768px]:pt-[4.5rem] max-[1024px]:pb-20 md:pb-28 md:pt-28">
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 max-[768px]:gap-8 max-[768px]:px-4 md:grid-cols-12 md:items-center md:gap-16 md:px-10">
        <div className="md:col-span-5">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[470px]">
            <Image
              src="/media-kit-cover.png"
              alt="Couverture du media-kit La Gazette du Faubourg"
              fill
              priority
              className="object-contain object-center"
              sizes="(max-width: 768px) 88vw, 470px"
            />
          </div>
        </div>

        <div className="md:col-span-6 md:col-start-7">
          <h1 className="font-[family-name:var(--font-serif)] text-[clamp(2rem,3.6vw,3.1rem)] font-light leading-[1.1] text-[#0a0a0a]">
            Le media-kit
          </h1>
          <p className="mt-5 max-w-[52ch] font-[family-name:var(--font-sans)] text-[1.05rem] leading-relaxed text-[#2a2a2a]">
            Retrouvez la présentation de {site.name}, ses audiences et ses formats publicitaires.
            Téléchargez le document pour découvrir les opportunités de partenariat.
          </p>
          <div className="mt-10">
            <Link
              href={mediaKitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center rounded-full border border-[#202126] px-6 py-3 font-[family-name:var(--font-sans)] text-sm font-medium tracking-[0.04em] text-[#202126] transition-colors hover:bg-[#202126] hover:text-white max-[768px]:w-full max-[768px]:justify-center max-[1024px]:px-5"
            >
              Telecharger le media-kit
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
