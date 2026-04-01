"use client";

import Link from "next/link";
import { MotionDiv } from "@/components/motion-prefers";
import { fadeUp } from "@/lib/motion";
import { site } from "@/lib/content/site";

export function NewsletterSection() {
  return (
    <section id="newsletter" className="scroll-mt-24 border-y border-black/[0.06] bg-[#fafafa] py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <MotionDiv
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10% 0px" }}
          className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-end"
        >
          <div className="max-w-xl">
            <h2
              className="w-max max-w-full text-left text-[34px] font-normal italic leading-tight tracking-tight text-black lg:text-[48px] lg:leading-[1.12]"
              style={{ fontFamily: "Griffiths, serif" }}
            >
              Abonnez-vous à la Newsletter
            </h2>
            <p
              className="mb-0 mt-3 text-justify text-[18px] font-normal leading-[1.6] text-pretty text-black/70 max-[767px]:leading-[1.55] max-[1024px]:text-[17px] max-[1024px]:leading-[1.58]"
              style={{ fontFamily: "Garamond, serif", letterSpacing: "-0.2px" }}
            >
              Recevez les temps forts du Faubourg et les nouvelles parutions.
            </p>
          </div>
          <Link
            href={site.newsletterUrl}
            className="inline-flex shrink-0 items-center gap-3 border border-[#0a0a0a] bg-[#0a0a0a] px-8 py-3.5 font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.24em] text-white transition-opacity hover:opacity-90 md:self-end"
          >
            S’abonner
            <span aria-hidden>↗</span>
          </Link>
        </MotionDiv>
      </div>
    </section>
  );
}
