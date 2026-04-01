export const site = {
  /** Logo header (fichier dans /public) — aussi utilisé comme avatar type Story sur les Reels */
  navbarLogoSrc: "/logo-gazette-navbar.webp",
  /** Logo barre mobile — même ressource que le bloc hero (format plus lisible en petit) */
  navbarLogoMobileSrc: "/logo-comite-faubourg.png",
  name: "La Gazette du Faubourg",
  officialTitle: "La Voix Officielle du Comité du Faubourg Saint-Honoré",
  url: "https://www.lagazettedufaubourg.fr",
  tagline: "La voix officielle du Comité du Faubourg Saint-Honoré",
  description:
    "Média de presse imprimé et digital, voix officielle du Comité du Faubourg Saint-Honoré. Un regard contemporain sur l’horlogerie, la joaillerie, la mode, les arts et l’art de vivre.",
  heroImageUrl:
    "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2400&auto=format&fit=crop",
  /**
   * Vidéo page d’accueil (bloc « cinéma » sous l’intro).
   * — MP4 : URL directe (prioritaire si non vide).
   * — Sinon : renseigner youtubeId (11 caractères, ex. SBpvGCnlEN0) et laisser mp4Src vide.
   */
  homeVideo: {
    enabled: true,
    eyebrow: "La Gazette",
    title: "Le Faubourg en mouvement",
    caption:
      "Spectacle musical « Carol of the Bells » — une soirée d’exception du Comité du Faubourg Saint-Honoré.",
    mp4Src:
      "https://res.cloudinary.com/dbxpmbirq/video/upload/v1774712663/Spectacle_musical_exceptionnel_de_Carol_of_the_Bells_-_Comit%C3%A9_du_Faubourg_Saint-Honor%C3%A9_ihgahw.mp4",
    youtubeId: null,
    posterSrc: null,
  },
  instagramUrl: "https://www.instagram.com/lagazettedufaubourg/",
  instagramLabel: "Instagram",
  /** Bandeau type Story / Reels sur les vidéos de la section Instagram */
  instagramReels: {
    displayHandle: "lagazettedufaubourg",
  },
  youtubeUrl: "https://www.youtube.com/",
  twitterUrl: "https://twitter.com/",
  facebookUrl: "https://www.facebook.com/",
  /** URL du media-kit (à ajuster selon la page réelle) */
  mediaKitUrl: "https://www.lagazettedufaubourg.fr",
  /** Page d’inscription newsletter (interne) */
  newsletterUrl: "/newsletter",
  /** E-mails de contact — remplacer par les adresses réelles */
  emailRedaction: "redaction@lagazettedufaubourg.fr",
  emailAnnonceurs: "annonces@lagazettedufaubourg.fr",
  emailPartenariats: "partenariats@lagazettedufaubourg.fr",
} as const;
