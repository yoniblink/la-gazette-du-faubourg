"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { useMemo } from "react";

type Props = HTMLMotionProps<"div">;

export function MotionDiv({
  children,
  initial,
  animate,
  whileInView,
  variants,
  transition,
  viewport,
  ...rest
}: Props) {
  const prefersReduced = useReducedMotion();
  const nodes = children as ReactNode;

  const reducedTransition = useMemo(() => {
    if (!prefersReduced) return undefined;
    return { duration: 0 } as const;
  }, [prefersReduced]);

  return (
    <motion.div
      initial={prefersReduced ? false : initial}
      animate={prefersReduced ? undefined : animate}
      whileInView={prefersReduced ? undefined : whileInView}
      variants={prefersReduced ? undefined : variants}
      transition={prefersReduced ? reducedTransition : transition}
      viewport={prefersReduced ? undefined : viewport}
      {...rest}
    >
      {nodes}
    </motion.div>
  );
}
