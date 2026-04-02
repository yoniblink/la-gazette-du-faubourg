"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { site } from "@/lib/content/site";
import { garamondNavItalic } from "@/lib/fonts/garamond-nav";
import { fadeUp } from "@/lib/motion";
import type { InstagramReelPublic } from "@/lib/data/instagram-reels";
import { InstagramReelsStack } from "@/components/sections/InstagramReelsStack";

export function InstagramStripContent({ reels }: { reels: InstagramReelPublic[] }) {
  return (
    <section id="suivre" className="scroll-mt-24 bg-[#fafafa] py-20 max-[768px]:py-14 max-[1024px]:py-16 md:py-24">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-12% 0px" }}
        className="mx-auto max-w-6xl px-6 max-[768px]:px-4 md:px-10"
      >
        <div className="flex flex-col items-center gap-6 text-center md:gap-8">
          <h2
            className="mx-auto w-max max-w-full text-center text-[34px] font-normal italic leading-tight tracking-tight text-black max-[768px]:w-full max-[768px]:text-balance lg:text-[48px] lg:leading-[1.12]"
            style={{ fontFamily: "Griffiths, serif" }}
          >
            Retrouvez-nous sur Instagram
          </h2>
          <Link
            href={site.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-[44px] shrink-0 items-center gap-4 border border-black/[0.1] bg-white px-8 py-5 transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-black/[0.22] hover:shadow-[0_20px_50px_-24px_rgba(10,10,10,0.18)] max-[768px]:w-full max-[768px]:max-w-md max-[768px]:justify-center max-[1024px]:px-6"
          >
            <Image
              src={site.faviconSrc}
              alt=""
              width={32}
              height={32}
              className="h-7 w-7 object-contain transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
            />
            <div className="text-left">
              <p className="font-[family-name:var(--font-sans)] text-[10px] uppercase tracking-[0.28em] text-[#7a7a7a]">
                {site.instagramLabel}
              </p>
              <p
                className={[
                  garamondNavItalic.className,
                  "mt-1 text-left text-[17px] font-medium italic leading-none text-black antialiased transition-opacity group-hover:opacity-80 md:text-[17px] lg:text-[18px] xl:text-[19px]",
                ].join(" ")}
              >
                Suivez la Gazette du Faubourg
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
