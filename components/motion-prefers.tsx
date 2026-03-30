"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

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
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const reduce = hydrated && prefersReduced;
  const nodes = children as ReactNode;

  if (reduce) {
    return <div {...(rest as React.ComponentPropsWithoutRef<"div">)}>{nodes}</div>;
  }

  return (
    <motion.div
      initial={initial}
      animate={animate}
      whileInView={whileInView}
      variants={variants}
      transition={transition}
      viewport={viewport}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
