import type { ReactNode } from "react";

/** Segment remounts on navigation; page motion lives in `PublicPageTransition`. */
export default function Template({ children }: { children: ReactNode }) {
  return children;
}
