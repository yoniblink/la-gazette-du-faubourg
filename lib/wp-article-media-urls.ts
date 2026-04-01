/**
 * Réécrit les URLs des médias WordPress dans le HTML généré depuis TipTap,
 * pour que les images s’affichent en dev (www protégé par Vercel → 403).
 *
 * - En développement : `https?://www.lagazettedufaubourg.fr` → `http://lagazettedufaubourg.local`
 *   (WordPress local doit servir les mêmes fichiers sous /wp-content/uploads/…).
 * - Si `WORDPRESS_MEDIA_ORIGIN` est défini : toutes les variantes ci-dessous sont remplacées
 *   par cette origine (ex. URL publique Supabase si vous pointez un proxy — en pratique
 *   préférez des URLs Supabase déjà stockées en base après `hydrate:article-inline-images`).
 */
const WWW_HOSTS = [
  "https://www.lagazettedufaubourg.fr",
  "http://www.lagazettedufaubourg.fr",
  "https://lagazettedufaubourg.fr",
  "http://lagazettedufaubourg.fr",
];

const LOCAL_DEFAULT = "http://lagazettedufaubourg.local";

export function resolveWpMediaInArticleHtml(html: string): string {
  const explicit = process.env.WORDPRESS_MEDIA_ORIGIN?.trim().replace(/\/$/, "");
  if (explicit && explicit !== "0" && explicit !== "false") {
    let out = html;
    for (const h of WWW_HOSTS) {
      out = out.replaceAll(h, explicit);
    }
    out = out.replaceAll(LOCAL_DEFAULT, explicit);
    return out;
  }

  if (process.env.NODE_ENV !== "development") {
    return html;
  }

  const local = LOCAL_DEFAULT;
  let out = html;
  for (const h of WWW_HOSTS) {
    out = out.replaceAll(h, local);
  }
  return out;
}
