"use client";

import Link from "next/link";
import { MotionDiv } from "@/components/motion-prefers";
import { fadeUp } from "@/lib/motion";
import { site } from "@/lib/content/site";

export function NewsletterSection() {
  return (
    <section id="newsletter" className="scroll-mt-24 border-y border-black/[0.06] bg-[#fafafa] py-20 md:py-24">
      <div className="mx-auto max-w-6xl pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))] md:px-10">
        <MotionDiv
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10% 0px" }}
          className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-end"
        >
          <div className="max-w-xl">
            <h2 className="font-[family-name:var(--font-serif)] text-2xl font-light text-[#0a0a0a] md:text-3xl">
              Abonnez-vous à la Newsletter
            </h2>
            <p className="mt-4 font-[family-name:var(--font-sans)] text-sm leading-relaxed text-[#5a5a5a]">
              Recevez les temps forts du Faubourg et les nouvelles parutions — le traitement des données
              correspond aux engagements du site officiel.
            </p>
          </div>
          <Link
            href={site.newsletterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 w-full items-center justify-center gap-3 border border-[#0a0a0a] bg-[#0a0a0a] px-8 py-3.5 font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.24em] text-white transition-opacity hover:opacity-90 md:min-h-0 md:w-auto"
          >
            S’abonner
            <span aria-hidden>↗</span>
          </Link>
        </MotionDiv>
      </div>
    </section>
  );
}
