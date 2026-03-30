/**
 * Réglages « réalisme » pour StPageFlip (react-pageflip), sans fork du moteur.
 * Voir page-flip / Settings (drawShadow, maxShadowOpacity, flippingTime, …).
 */
export const FLIPBOOK_STPAGE_FLIP_VISUAL = {
  /** 0–1 : ombres portées / crénage pendant le flip des pages SOUFFLES (clip-path). */
  maxShadowOpacity: 0.86,
  /** ms : un peu plus long = mouvement plus lisible et « lourd » façon papier. */
  flippingTime: 960,
  /** Espace sous les calques internes (ombres canvas / pages). */
  startZIndex: 4,
  /** px : swipe mobile un peu plus sensible sans déclencher à la marge. */
  swipeDistance: 26,
} as const;
