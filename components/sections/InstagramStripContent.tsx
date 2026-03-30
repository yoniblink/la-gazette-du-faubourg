"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { site } from "@/lib/content/site";
import { fadeUp } from "@/lib/motion";
import type { InstagramReelPublic } from "@/lib/data/instagram-reels";
import { InstagramReelsStack } from "@/components/sections/InstagramReelsStack";

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.15}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="17.25" cy="6.75" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function InstagramStripContent({ reels }: { reels: InstagramReelPublic[] }) {
  return (
    <section id="suivre" className="scroll-mt-24 bg-[#fafafa] py-20 md:py-24">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-12% 0px" }}
        className="mx-auto max-w-6xl px-6 md:px-10"
      >
        <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-serif)] text-2xl font-light text-[#0a0a0a] md:text-3xl">
              Retrouvez-nous sur Instagram
            </h2>
            <p className="mt-3 max-w-md font-[family-name:var(--font-sans)] text-sm leading-relaxed text-[#5a5a5a]">
              Le fil du Faubourg — coulisses, temps forts et regard éditorial.
            </p>
          </div>
          <Link
            href={site.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex shrink-0 items-center gap-4 border border-black/[0.1] bg-white px-8 py-5 transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-black/[0.22] hover:shadow-[0_20px_50px_-24px_rgba(10,10,10,0.18)]"
          >
            <InstagramGlyph className="h-7 w-7 text-[#0a0a0a] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]" />
            <div className="text-left">
              <p className="font-[family-name:var(--font-sans)] text-[10px] uppercase tracking-[0.28em] text-[#7a7a7a]">
                {site.instagramLabel}
              </p>
              <p className="mt-1 font-[family-name:var(--font-serif)] text-lg text-[#0a0a0a]">
                Suivre la Gazette
              </p>
            </div>
            <span className="ml-2 text-[#0a0a0a] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5">
              ↗
            </span>
          </Link>
        </div>

        {reels.length > 0 ? <InstagramReelsStack reels={reels} /> : null}
      </motion.div>
    </section>
  );
}
