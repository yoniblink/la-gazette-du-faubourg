"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { MotionDiv } from "@/components/motion-prefers";
import { site } from "@/lib/content/site";
import { fadeUp } from "@/lib/motion";

function pickStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function hasHomeVideo() {
  const v = site.homeVideo;
  if (!v.enabled) return false;
  const mp4 = v.mp4Src.trim();
  const yt = pickStr(v.youtubeId);
  return mp4.length > 0 || yt.length > 0;
}

export function HomeVideo() {
  const reduceMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const v = site.homeVideo;

  useEffect(() => {
    if (reduceMotion && videoRef.current) {
      videoRef.current.pause();
    }
  }, [reduceMotion]);

  if (!hasHomeVideo()) {
    return null;
  }

  const mp4 = v.mp4Src.trim();
  const youtubeId = pickStr(v.youtubeId);
  const useYoutube = mp4.length === 0 && youtubeId.length > 0;
  const posterRaw = pickStr(v.posterSrc);
  const poster = posterRaw.length > 0 ? posterRaw : undefined;

  return (
    <section
      aria-label={v.title}
      className="scroll-mt-24 border-t border-white/[0.06] bg-[#0d0d0d] py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        {v.eyebrow ? (
          <MotionDiv
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-10% 0px" }}
            className="font-[family-name:var(--font-sans)] text-[11px] font-medium uppercase tracking-[0.35em] text-white/45"
          >
            {v.eyebrow}
          </MotionDiv>
        ) : null}
        <MotionDiv
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10% 0px" }}
          className={`font-[family-name:var(--font-serif)] text-[clamp(1.65rem,3.2vw,2.35rem)] font-light leading-snug tracking-tight text-white ${v.eyebrow ? "mt-3" : ""}`}
        >
          {v.title}
        </MotionDiv>
      </div>

      <MotionDiv
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-8% 0px" }}
        className="mx-auto mt-12 max-w-5xl px-6 md:mt-14 md:px-10"
      >
        <div className="relative overflow-hidden rounded-[2px] shadow-[0_32px_100px_-32px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.12]">
          <div className="relative aspect-video w-full bg-black">
            {useYoutube ? (
              <iframe
                title={v.title}
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`}
                className="absolute inset-0 h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                src={mp4}
                poster={poster}
                controls
                playsInline
                muted
                loop
                autoPlay={reduceMotion !== true}
              />
            )}
          </div>
        </div>

        {v.caption ? (
          <p className="mx-auto mt-6 max-w-2xl text-center font-[family-name:var(--font-sans)] text-[13px] leading-[1.75] text-white/50 md:text-[14px]">
            {v.caption}
          </p>
        ) : null}
      </MotionDiv>
    </section>
  );
}
