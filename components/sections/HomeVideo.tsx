"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/content/site";

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
  const [canAutoplay, setCanAutoplay] = useState(true);
  const v = site.homeVideo;

  useEffect(() => {
    setCanAutoplay(!reduceMotion);
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
    <section aria-label={v.title} className="scroll-mt-24">
      <div className="w-full">
        <div className="relative w-full overflow-hidden">
          <div className="relative aspect-[24/7] w-full md:aspect-[26/7]">
            {useYoutube ? (
              <iframe
                title={v.title}
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&controls=0`}
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
                playsInline
                muted
                loop
                autoPlay={canAutoplay}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
