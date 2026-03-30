/** Valeurs par défaut partagées (admin + serveur). */
export const FLIPBOOK_DEFAULT_MAX_PAGES = 40;
export const FLIPBOOK_MAX_PAGES_CAP = 250;

/** Multiplicateur pixels / largeur CSS (≥2.5 recommandé pour texte net sur grands écrans). */
export const FLIPBOOK_DEFAULT_RENDER_DPR = 2.75;
/** Demi-pages (largeur CSS d’une colonne). Jpeg iLovePDF + rendu Sharp suivent ce ratio. */
export const FLIPBOOK_DEFAULT_HALF_SPREAD_CSS_PX = 480;
/** Résolution de sortie iLovePDF pdfjpg (72–300 typique). */
export const FLIPBOOK_DEFAULT_ILOVEPDF_DPI = 300;
/** Qualité WebP flipbook (50–100). */
export const FLIPBOOK_DEFAULT_WEBP_QUALITY = 90;
