"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useNavigationPending } from "@/components/NavigationPendingProvider";

const easeLux = [0.22, 1, 0.36, 1] as const;

const enterExit = {
  duration: 0.42,
  ease: easeLux,
} as const;

const pendingShell = {
  duration: 0.32,
  ease: easeLux,
} as const;

export function PublicPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const navigationPending = useNavigationPending();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      className="min-h-0 min-w-0 w-full will-change-[opacity,filter,transform]"
      initial={false}
      animate={
        navigationPending
          ? {
              opacity: 0.68,
              filter: "blur(5px)",
              scale: 0.997,
              transition: pendingShell,
            }
          : {
              opacity: 1,
              filter: "blur(0px)",
              scale: 1,
              transition: pendingShell,
            }
      }
      style={{ pointerEvents: navigationPending ? "none" : "auto" }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          className="min-h-0 min-w-0 w-full"
          initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
          animate={{
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: enterExit,
          }}
          exit={{
            opacity: 0,
            y: -8,
            filter: "blur(4px)",
            transition: { ...enterExit, duration: 0.32 },
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
