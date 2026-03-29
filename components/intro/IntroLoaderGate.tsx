"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
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
          className="relative min-h-0 w-full"
          initial={false}
          animate={
            contentLocked
              ? contentMotion.locked
              : phase === "exiting"
                ? contentMotion.exiting
                : contentMotion.revealed
          }
          style={{
            pointerEvents: contentLocked ? "none" : "auto",
          }}
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
  const title = site.name;
  const chars = useMemo(() => title.split(""), [title]);
  const exiting = phase === "exiting";

  /* Slower, more legible pacing (~×1.5 vs original). */
  const stagger = 0.048;
  const delayChildren = 0.28;
  const letterDuration = 0.95;
  const holdAfterLetters = 0.58;
  const totalLetterSequence =
    delayChildren + (chars.length - 1) * stagger + letterDuration;

  useEffect(() => {
    if (phase !== "intro" || exiting) return;
    const ms = (totalLetterSequence + holdAfterLetters) * 1000;
    const t = setTimeout(() => onSequenceComplete(), ms);
    return () => clearTimeout(t);
  }, [
    phase,
    exiting,
    onSequenceComplete,
    totalLetterSequence,
    holdAfterLetters,
  ]);

  const showLetters = phase === "intro" || exiting;

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
        <motion.h1
          className="font-[family-name:var(--font-serif)] text-[clamp(1.35rem,4.5vw,2.35rem)] font-light leading-[1.15] tracking-[0.02em] text-[#0a0a0a]"
          initial="hidden"
          animate={showLetters ? "show" : "hidden"}
          variants={{
            hidden: {},
            show: {
              transition: {
                delayChildren,
                staggerChildren: stagger,
              },
            },
          }}
        >
          {chars.map((char, i) => (
            <motion.span
              key={`${i}-${char === " " ? "sp" : char}`}
              className="inline-block"
              style={{
                width: char === " " ? "0.28em" : undefined,
                minWidth: char === " " ? "0.28em" : undefined,
              }}
              variants={{
                hidden: {
                  opacity: 0,
                  y: 14,
                  filter: "blur(12px)",
                },
                show: {
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  transition: {
                    duration: letterDuration,
                    ease: easeLux,
                  },
                },
              }}
            >
              {char === " " ? "\u00a0" : char}
            </motion.span>
          ))}
        </motion.h1>

        <motion.div
          className="mt-7 h-px w-10 bg-[rgba(201,169,98,0.38)]"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={
            showLetters && !exiting
              ? {
                  opacity: 1,
                  scaleX: 1,
                  transition: {
                    delay: delayChildren + 0.52,
                    duration: 1.28,
                    ease: easeLux,
                  },
                }
              : exiting
                ? { opacity: 0, transition: { duration: 0.5 } }
                : { opacity: 0, scaleX: 0 }
          }
        />

        <motion.p
          className="mt-5 font-[family-name:var(--font-sans)] text-[10px] font-medium uppercase tracking-[0.28em] text-[#6b6b6b]"
          initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
          animate={
            showLetters && !exiting
              ? {
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  transition: {
                    delay: delayChildren + 0.82,
                    duration: 1.05,
                    ease: easeLux,
                  },
                }
              : exiting
                ? { opacity: 0, transition: { duration: 0.5 } }
                : { opacity: 0, y: 6, filter: "blur(6px)" }
          }
        >
          Magazine du Faubourg
        </motion.p>
      </div>
    </motion.div>
  );
}
