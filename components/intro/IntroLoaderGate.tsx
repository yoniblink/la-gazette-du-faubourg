"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { site } from "@/lib/content/site";

const STORAGE_KEY = "lgdf-intro-seen";

type Phase = "off" | "pending" | "intro" | "exiting";

function initialPhase(pathname: string | null): Phase {
  if (pathname !== "/") return "off";
  return "pending";
}

const easeLux = [0.22, 1, 0.36, 1] as const;
const easeOutSoft = [0.45, 0, 0.55, 1] as const;

export function IntroLoaderGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  /** Same first paint as SSR; applying prefs after mount avoids hydration style mismatches from `useReducedMotion()`. */
  const [motionReduced, setMotionReduced] = useState(false);
  useEffect(() => {
    setMotionReduced(Boolean(reduceMotion));
  }, [reduceMotion]);
  const [phase, setPhase] = useState<Phase>(() => initialPhase(pathname));

  /* Intro gate: read sessionStorage once before paint so returning visitors on `/` do not flash content under the overlay. */
  useLayoutEffect(() => {
    if (pathname !== "/") {
      setPhase("off");
      return;
    }
    if (reduceMotion) {
      setPhase("off");
      return;
    }
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") {
        setPhase("off");
        return;
      }
    } catch {
      /* private / blocked storage */
    }
    setPhase("intro");
  }, [pathname, reduceMotion]);

  const beginExit = useCallback(() => {
    setPhase("exiting");
  }, []);

  const finishIntro = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setPhase("off");
  }, []);

  /** Same DOM on `/` for SSR + client; never branch on `reduceMotion` here (SSR vs client can differ and cause hydration errors). */
  const isHomeRoute = pathname === "/";
  const contentLocked = phase === "pending" || phase === "intro";

  const contentMotion = motionReduced
    ? {
        locked: {
          opacity: 0,
          filter: "blur(0px)",
          y: 0,
          transition: { duration: 0 },
        },
        revealed: {
          opacity: 1,
          filter: "blur(0px)",
          y: 0,
          transition: { duration: 0 },
        },
        exiting: {
          opacity: 1,
          filter: "blur(0px)",
          y: 0,
          transition: { duration: 0 },
        },
      }
    : {
        locked: {
          opacity: 0,
          filter: "blur(10px)",
          y: 10,
          transition: { duration: 0 },
        },
        revealed: {
          opacity: 1,
          filter: "blur(0px)",
          y: 0,
          transition: { duration: 0 },
        },
        exiting: {
          opacity: 1,
          filter: "blur(0px)",
          y: 0,
          transition: {
            duration: 1.75,
            ease: easeLux,
            delay: 0.08,
          },
        },
      };

  return (
    <>
      {isHomeRoute ? (
        <motion.div
          className="relative min-h-0 min-w-0 w-full overflow-x-clip"
          initial={false}
          animate={
            contentLocked
              ? contentMotion.locked
              : phase === "exiting"
                ? contentMotion.exiting
                : contentMotion.revealed
          }
          aria-hidden={contentLocked}
        >
          {children}
        </motion.div>
      ) : (
        children
      )}

      {(phase === "pending" || phase === "intro" || phase === "exiting") && (
        <MagazineIntroOverlay
          phase={phase}
          onSequenceComplete={beginExit}
          onFadeOutComplete={finishIntro}
        />
      )}
    </>
  );
}

function MagazineIntroOverlay({
  phase,
  onSequenceComplete,
  onFadeOutComplete,
}: {
  phase: Phase;
  onSequenceComplete: () => void;
  onFadeOutComplete: () => void;
}) {
  const exiting = phase === "exiting";

  const logoDelay = 0.26;
  const logoFillDelay = logoDelay + 0.1;
  const logoDuration = 3.0;
  const holdAfterLogo = 0;
  const totalLogoSequence = logoFillDelay + logoDuration;

  useEffect(() => {
    if (phase !== "intro" || exiting) return;
    const ms = (totalLogoSequence + holdAfterLogo) * 1000;
    const t = setTimeout(() => onSequenceComplete(), ms);
    return () => clearTimeout(t);
  }, [phase, exiting, onSequenceComplete, totalLogoSequence, holdAfterLogo]);

  const showLogo = phase === "intro" || exiting;

  return (
    <motion.div
      role="presentation"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#fafafa] px-6 ${exiting ? "pointer-events-none" : ""}`}
      initial={{ opacity: 0 }}
      animate={
        exiting
          ? {
              opacity: 0,
              scale: 1.012,
              filter: "blur(9px)",
              transition: { duration: 1.28, ease: easeOutSoft },
            }
          : {
              opacity: 1,
              scale: 1,
              filter: "blur(0px)",
              transition: { duration: 0.72, ease: easeLux },
            }
      }
      onAnimationComplete={() => {
        if (exiting) onFadeOutComplete();
      }}
    >
      <div className="flex max-w-[min(90vw,42rem)] flex-col items-center text-center">
        <motion.div
          className="relative h-[110px] w-[min(90vw,520px)]"
          initial={{ opacity: 0, y: 12, filter: "blur(10px)" }}
          animate={
            showLogo && !exiting
              ? {
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  transition: {
                    delay: logoDelay,
                    duration: logoDuration,
                    ease: easeLux,
                  },
                }
              : exiting
                ? { opacity: 0, transition: { duration: 0.5 } }
                : { opacity: 0, y: 12, filter: "blur(10px)" }
          }
        >
          <Image
            src={site.navbarLogoMobileSrc}
            alt={site.name}
            fill
            priority
            quality={75}
            sizes="520px"
            className="object-contain object-center opacity-20"
          />
          <motion.div
            className="absolute inset-0 overflow-hidden"
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={
              showLogo && !exiting
                ? {
                    clipPath: "inset(0 0% 0 0)",
                    transition: {
                      delay: logoFillDelay,
                      duration: logoDuration,
                      ease: easeLux,
                    },
                  }
                : exiting
                  ? {
                      opacity: 0,
                      transition: { duration: 0.35 },
                    }
                  : { clipPath: "inset(0 100% 0 0)" }
            }
          >
            <Image
              src={site.navbarLogoMobileSrc}
              alt=""
              fill
              priority
              quality={75}
              sizes="520px"
              className="object-contain object-center"
            />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
