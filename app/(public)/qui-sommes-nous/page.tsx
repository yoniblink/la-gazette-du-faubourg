import Image from "next/image";
import type { Metadata } from "next";
import { site } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Qui sommes-nous",
  description: `L'équipe de ${site.name} et ses interlocuteurs.`,
  openGraph: {
    title: `Qui sommes-nous | ${site.name}`,
    description: `L'équipe de ${site.name} et ses interlocuteurs.`,
    locale: "fr_FR",
  },
  alternates: {
    canonical: "/qui-sommes-nous",
  },
};

const members = [
  {
    name: "Liam-Rabah Touggourti",
    role: "Directeur Fondateur",
    extra: "Directeur de la rédaction et de la création",
    email: "contact@gazette-faubourg.fr",
  },
  {
    name: "Benjamin Cymerman",
    role: "Président du Comité du Faubourg Saint-Honoré",
  },
  {
    name: "Rebecca Gauthier",
    role: "Administratrice de la rédaction",
    extra: "Comité du Faubourg Saint-Honoré",
    email: "rebecca.gauthier@comitefsh.com",
  },
];

export default function QuiSommesNousPage() {
  return (
    <main className="flex flex-1 flex-col bg-[#f8f8f8] pb-24 pt-20 md:pb-28 md:pt-28">
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 md:grid-cols-12 md:items-start md:gap-16 md:px-10">
        <div className="md:col-span-7">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[520px] md:mx-0 md:max-w-full">
            <Image
              src="/qui-sommes-nous-illustration-transparent.png"
              alt="La Gazette du Faubourg Media — illustration"
              fill
              priority
              className="object-contain object-center"
              sizes="(max-width: 768px) 92vw, (max-width: 1024px) 55vw, 672px"
            />
          </div>
        </div>

        <div className="space-y-14 md:col-span-5 md:col-start-8">
          {members.map((member) => (
            <article key={member.name}>
              <h1 className="font-[family-name:var(--font-serif)] text-[clamp(1.4rem,2.2vw,2rem)] font-light leading-[1.2] text-[#0a0a0a]">
                {member.name}
              </h1>
              <p className="mt-2 font-[family-name:var(--font-serif)] text-[clamp(1.1rem,1.6vw,1.35rem)] leading-[1.3] text-[#111]">
                {member.role}
              </p>
              {member.extra ? (
                <p className="mt-1 max-w-[40ch] font-[family-name:var(--font-serif)] text-[clamp(1.05rem,1.45vw,1.25rem)] leading-[1.35] text-[#111]">
                  {member.extra}
                </p>
              ) : null}
              {member.email ? (
                <p className="mt-2 font-[family-name:var(--font-sans)] text-[1rem] font-semibold text-[#0a0a0a]">
                  {member.email}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
