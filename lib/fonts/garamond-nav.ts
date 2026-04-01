import { Cormorant_Garamond } from "next/font/google";

/**
 * Menu type magazine — équivalent web à « Garamond Italic » Elementor.
 * Les `@font-face` locaux pointent vers des fichiers souvent absents du repo ;
 * cette fonte (woff2 via next/font) se charge correctement sur Safari iOS/macOS.
 */
export const garamondNavItalic = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["italic"],
  display: "swap",
});
