"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { fadeUp, staggerContainer } from "@/lib/motion";

export type FeaturedItem = {
  id: string;
  rubrique: string;
  title: string;
  excerpt: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
  layout: "lead" | "standard";
};

export function Featured({ items }: { items: FeaturedItem[] }) {
  return (
    <section id="actualite" className="scroll-mt-24 bg-white py-24 md:py-32">
      <SectionHeading title="L’actualité du Faubourg …" />
      {items.length === 0 ? (
        <p className="mx-auto mt-14 max-w-6xl px-6 text-center text-sm text-[#7a7a7a] md:px-10">
          Les prochains articles paraîtront ici.
        </p>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10% 0px" }}
          className="mx-auto mt-14 grid max-w-6xl gap-8 px-6 md:mt-16 md:grid-cols-12 md:gap-10 md:px-10"
        >
          {items.map((article) => {
            const isLead = article.layout === "lead";
            const external = article.href.startsWith("http");
            return (
              <motion.article
                key={article.id}
                variants={fadeUp}
                className={`group flex flex-col ${isLead ? "md:col-span-12" : "md:col-span-6"}`}
              >
                <Link
                  href={article.href}
                  {...(external
                    ? { target: "_blank" as const, rel: "noopener noreferrer" as const }
                    : {})}
                  className="flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <div
                    className={`relative w-full overflow-hidden bg-[#f3f3f3] ${
                      isLead ? "aspect-[21/9] md:aspect-[2.4/1]" : "aspect-[4/3]"
                    }`}
                  >
                    <Image
                      src={article.imageSrc}
                      alt={article.imageAlt}
                      fill
                      sizes={isLead ? "(max-width:768px) 100vw, 1200px" : "(max-width:768px) 100vw, 40vw"}
                      className="object-cover transition-[transform] duration-[1s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="mt-6 flex flex-1 flex-col md:mt-8">
                    <p className="font-[family-name:var(--font-sans)] text-[10px] font-medium uppercase tracking-[0.28em] text-[#7a7a7a]">
                      {article.rubrique}
                    </p>
                    <h3
                      className={`mt-3 font-[family-name:var(--font-serif)] font-light text-[#0a0a0a] transition-[color,letter-spacing] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:tracking-tight group-hover:text-[#2c2c2c] ${
                        isLead ? "text-3xl md:max-w-3xl md:text-[2.35rem]" : "text-2xl md:text-[1.75rem]"
                      }`}
                    >
                      {article.title}
                    </h3>
                    <p className="mt-4 max-w-2xl flex-1 font-[family-name:var(--font-sans)] text-sm leading-relaxed text-[#4a4a4a] md:text-[15px]">
                      {article.excerpt}
                    </p>
                    <span className="mt-6 inline-flex items-center gap-2 font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.2em] text-[#0a0a0a]">
                      <span className="relative">
                        Lire l’article
                        <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[#0a0a0a] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
                      </span>
                      <span
                        className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden
                      >
                        {external ? "↗" : "→"}
                      </span>
                    </span>
                  </div>
                </Link>
              </motion.article>
            );
          })}
        </motion.div>
      )}
    </section>
  );
}
