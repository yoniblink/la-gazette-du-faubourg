"use client";

import { EditorialCarousel } from "@/components/sections/EditorialCarousel";
import { SectionHeading } from "@/components/ui/section-heading";
import type { FeaturedItem } from "@/lib/content/featured-item";
import { MotionDiv } from "@/components/motion-prefers";
import { fadeUp } from "@/lib/motion";

export type { FeaturedItem };

export function Featured({ items }: { items: FeaturedItem[] }) {
  return (
    <section id="actualite" className="scroll-mt-24 bg-white py-24 md:py-32">
      <SectionHeading title="L’actualité du Faubourg …" />
      {items.length === 0 ? (
        <p className="mx-auto mt-14 max-w-6xl pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))] text-center text-sm text-[#7a7a7a] md:px-10">
          Les prochains articles paraîtront ici.
        </p>
      ) : (
        <MotionDiv
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10% 0px" }}
          className="mx-auto mt-12 max-w-6xl pl-[max(1.5rem,env(safe-area-inset-left,0px))] pr-[max(1.5rem,env(safe-area-inset-right,0px))] md:mt-16 md:px-10"
        >
          <EditorialCarousel items={items} />
        </MotionDiv>
      )}
    </section>
  );
}
