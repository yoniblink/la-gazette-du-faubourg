"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

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
  const reduce = useReducedMotion();
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
