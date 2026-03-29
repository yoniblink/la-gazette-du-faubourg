"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { site } from "@/lib/content/site";
import { fadeUp, staggerContainer } from "@/lib/motion";

const printImage =
  "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?q=80&w=2000&auto=format&fit=crop";

export function PrintRevue() {
  return (
    <section
      id="revue-papier"
      className="scroll-mt-24 border-y border-black/[0.06] bg-white py-24 md:py-32"
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10% 0px" }}
        className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-12 md:gap-16 md:px-10"
      >
        <motion.div variants={fadeUp} className="relative aspect-[4/5] w-full md:col-span-5">
          <Image
            src={printImage}
            alt="La Gazette du Faubourg en format imprimé, pages ouvertes"
            fill
            sizes="(max-width:768px) 100vw, 40vw"
            className="object-cover"
          />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.06]" />
        </motion.div>
        <motion.div variants={fadeUp} className="md:col-span-6 md:col-start-7">
          <h2 className="font-[family-name:var(--font-serif)] text-[clamp(1.65rem,3vw,2.35rem)] font-light leading-snug text-[#0a0a0a]">
            Découvrez La Gazette du Faubourg en format papier.
            <span className="mt-2 block text-[0.92em] text-[#3a3a3a]">
              Présente là où l’élégance se vit…
            </span>
          </h2>
          <p className="mt-6 font-[family-name:var(--font-sans)] text-[15px] leading-[1.8] text-[#3a3a3a]">
            Pensée comme un objet d’édition, la version imprimé prolonge l’expérience numérique : papier
            feuilleté, photographies traitées avec exigence, et silences graphiques qui laissent respirer les
            reportages. Elle est présente là où l’élégance se vit — du Faubourg aux adresses qui partagent la
            même notion de standard.
          </p>
          <p className="mt-4 font-[family-name:var(--font-sans)] text-sm leading-relaxed text-[#5a5a5a]">
            Voix officielle du Comité du Faubourg Saint-Honoré, chaque numéro consolide la crédibilité d’un
            média au service des maisons et du territoire.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 border border-[#0a0a0a]/18 bg-transparent px-7 py-3.5 font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.22em] text-[#0a0a0a] transition-[border-color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white"
            >
              Où trouver la revue
              <span className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5">
                ↗
              </span>
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
