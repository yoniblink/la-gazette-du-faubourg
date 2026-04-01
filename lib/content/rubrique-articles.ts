import type { RubriqueSiteArticle, RubriqueSlug } from "./types";

/**
 * Articles publiés sur ce site (contenu éditorial dérivé du magazine
 * [lagazettedufaubourg.fr/horlogerie-joaillerie](https://www.lagazettedufaubourg.fr/horlogerie-joaillerie/)).
 */
export const rubriqueArticlesBySlug: Partial<Record<RubriqueSlug, RubriqueSiteArticle[]>> = {
  "horlogerie-joaillerie": [
    {
      id: "hj-ap-qp",
      rubrique: "Horlogerie / Joaillerie",
      kicker: "Audemars Piguet",
      title: "Une nouvelle génération de Quantième Perpétuel",
      excerpt:
        "Pour son 150e anniversaire, Audemars Piguet dévoile le Calibre 7138 : quantième perpétuel automatique « tout-à-la-couronne », ergonomie et confort d’usage repensés. Jusqu’ici, le réglage des indications impliquait souvent plusieurs organes de commande ; désormais, une seule couronne suffit pour ajuster date, jour et mois avec une lisibilité préservée. Une réponse aux collectionneurs qui attendent complication de haut vol et simplicité au quotidien.",
      imageSrc:
        "https://www.lagazettedufaubourg.fr/wp-content/uploads/2026/01/CODE_26494BC-OO-D350KB-01_Life-Style_01-scaled.png",
      imageAlt: "Montre Audemars Piguet — quantième perpétuel",
      layout: "standard",
      articleSlug: "une-nouvelle-generationde-quantieme-perpetuel",
      sourceUrl: "https://www.lagazettedufaubourg.fr/une-nouvelle-generationde-quantieme-perpetuel/",
      body: [
        "Afin de marquer le début des célébrations de son 150e anniversaire, la manufacture suisse de haute horlogerie Audemars Piguet dévoile le Calibre 7138 : une nouvelle génération de mouvement automatique à quantième perpétuel pensée pour l’usage quotidien autant que pour la précision technique.",
        "Jusqu’ici, le réglage des indications du quantième — date, jour, mois, phases de lune selon les versions — impliquait souvent plusieurs organes de commande. Le Calibre 7138 simplifie radicalement l’expérience : pour la première fois, toutes les fonctions peuvent être ajustées via la couronne, dans un système que la marque résume comme un « tout-à-la-couronne ».",
        "Ce choix architectural renforce le confort d’utilisation et réduit la tentation d’interventions hasardeuses sur le mouvement. Il traduit une exigence contemporaine : une complication majeure doit rester lisible, fiable et agréable à vivre au poignet, au-delà du seul prestige mécanique.",
        "Sur le plan esthétique, les boîtiers et cadrans qui accueillent ce calibre prolongent la grammaire Audemars Piguet — finitions rayonnantes, équilibre entre sport et dress watch selon les déclinaisons — tout en laissant la part belle à la lisibilité des indications perpétuelles.",
        "À l’heure où le marché redemande des complications utiles et des gestes d’usage simplifiés, ce calibre pose un jalon : le quantième perpétuel comme fonction centrale, pensée pour durer et pour se régler naturellement, couronne après couronne.",
      ],
    },
    {
      id: "hj-breguet",
      rubrique: "Horlogerie / Joaillerie",
      kicker: "Breguet",
      title: "Reine de Naples 9935 & 8925",
      excerpt:
        "Pour les 250 ans de Breguet, la Reine de Naples s’enrichit : nouveaux mouvements, affichages inédits et finitions exclusives pour les références 9935 et 8925. Les silhouettes ovales et l’or signature dialoguent avec des innovations techniques qui prolongent l’héritage napolitain sans renier la personnalité de la collection. Une double proposition entre audace contemporaine et exigence de manufacture, bracelet tout en or ou cadran repensé selon les versions.",
      imageSrc:
        "https://www.lagazettedufaubourg.fr/wp-content/uploads/2026/01/image_1_1769093723550.png",
      imageAlt: "Breguet Reine de Naples",
      layout: "standard",
      articleSlug: "reine-de-naples9935-8925",
      sourceUrl: "https://www.lagazettedufaubourg.fr/reine-de-naples9935-8925/",
      body: [
        "Pour le 250e anniversaire de la Manufacture Breguet, la collection Reine de Naples — icône ovale née du commande de Caroline Murat — accueille deux familles de références qui prolongent à la fois l’héritage napolitain et la recherche technique de la maison.",
        "Les modèles 9935 inaugurent un mouvement inédit, des affichages repensés et des choix esthétiques résolument exclusifs : la silhouette caractéristique de la Reine de Naples s’enrichit de détails de cadran et de boîte qui affirment une personnalité contemporaine sans renier les codes Breguet.",
        "Les références 8925, quant à elles, adoptent un nouveau visage et un bracelet tout en or, avec une présence plus affirmée au poignet. Chacune de ces lignes intègre pour la première fois l’or Breguet dans une orchestration renouvelée des volumes et des reflets.",
        "Au-delà des spécifications, c’est une manière de célébrer deux siècles et demi d’invention : de la pompe à tact aux aiguilles « à pomme », la Reine de Naples reste le laboratoire où Breguet dialogue entre féminité horlogère et exigence de manufacture.",
        "Pour l’amateur comme pour le collectionneur, ces lancements marquent une étape : la Reine de Naples n’est plus seulement une forme reconnaissable entre toutes, mais un terrain d’expérimentation où chaque anniversaire devient une occasion de repousser les limites du style et du mouvement.",
      ],
    },
    {
      id: "hj-dynasty",
      rubrique: "Horlogerie / Joaillerie",
      kicker: "Exposition",
      title: "Dynasty ! Pouvoir, héritage et magnificence",
      excerpt:
        "À l’Hôtel de la Marine, la Collection Al Thani présente des joyaux historiques : pouvoir des cours, transmission et éclat des pierres. L’exposition déploie diadèmes, colliers et broches d’apparat où sciences du serti et symbolique du pouvoir se croisent. Pour La Gazette, Dynasty interroge ce lien entre héritage dynastique et art de la joaillerie, entre fastes publics et secrets de famille, sans jamais effacer la précision du geste artisanal.",
      imageSrc: "https://www.lagazettedufaubourg.fr/wp-content/uploads/2026/01/DYNASTY-1.png",
      imageAlt: "Collier et joyaux d’exception — exposition Dynasty",
      layout: "standard",
      articleSlug: "dynasty-pouvoir-heritage-et-magnificence",
      sourceUrl: "https://www.lagazettedufaubourg.fr/dynasty-pouvoir-heritage-et-magnificence/",
      body: [
        "Commandé en 1937 par le maharajah Digvijaysinhji de Nawanagar à l’occasion de son séjour à Londres pour le couronnement de George VI, un collier d’une envergure rare incarne l’une des collaborations les plus spectaculaires entre la Maison Cartier et les souverains indiens du XXe siècle.",
        "Jacques Cartier entretenait depuis des années une relation étroite avec Ranjitsinhji, maharajah de Nawanagar, nourrissant un dialogue constant entre les ateliers parisiens et les trésors de pierres de la cour. Ce fil narratif relie l’exposition à une histoire plus vaste : celle du bijou comme instrument de diplomatie, de prestige et de mémoire familiale.",
        "À l’Hôtel de la Marine, la Collection Al Thani déploie un ensemble de pièces où se croisent éclat des pierres, science du serti et symbolique du pouvoir. Diadèmes, broches et colliers d’apparat témoignent des fastes des cours européennes et des alliances qui se nouaient autour d’un écrin de diamants.",
        "L’exposition invite à lire le bijou comme un texte : matière, provenance, commanditaire et contexte historique composent une lecture où la magnificence n’efface jamais la précision du geste artisanal.",
        "Pour La Gazette du Faubourg, Dynasty interroge avec justesse ce lien intime entre héritage dynastique et art de la joaillerie : un même éclat peut porter à la fois l’éclat d’un couronnement et le secret d’une transmission de mère en fille.",
      ],
    },
    {
      id: "hj-vc-kalla",
      rubrique: "Horlogerie / Joaillerie",
      kicker: "Vacheron Constantin",
      title: "Grand Lady Kalla",
      excerpt:
        "Trois nouvelles interprétations de la Grand Lady Kalla : pierres de couleur, platine et or, dans la continuité de la Kallista depuis 1979. Vacheron Constantin prolonge une lignée où le boîtier-joaillier dialogue avec le mouvement : émeraudes sur platine, rubis et saphirs sur or blanc. Chaque pièce affirme le savoir-faire lapidaire et sertisseur de la manufacture dans une montre-architecture où lumière et matière se répondent.",
      imageSrc:
        "https://www.lagazettedufaubourg.fr/wp-content/uploads/2026/01/VAC_GrandLadyKalla_1208J_StillLife_Rubis_4x5_Crop_73974128.jpg-scaled.jpeg",
      imageAlt: "Vacheron Constantin Grand Lady Kalla",
      layout: "standard",
      articleSlug: "grand-lady-kalla",
      sourceUrl: "https://www.lagazettedufaubourg.fr/grand-lady-kalla/",
      body: [
        "Vacheron Constantin ouvre un nouveau chapitre dans la lignée des montres de haute joaillerie qui n’a cessé d’évoluer depuis la légendaire Kallista en 1979. La Grand Lady Kalla, déjà présentée en 2024, accueille trois interprétations qui explorent la couleur, la matière et la lumière.",
        "L’introduction des pierres de couleur dans cette famille transforme le rapport entre le boîtier-joaillier et le mouvement : les diamants blancs dialoguent avec des émeraudes serties sur platine 950, ou avec rubis et saphirs orchestrés sur or blanc 18 carats.",
        "Chaque version met en scène le savoir-faire de lapidaire et de sertisseur de la manufacture : le jeu des tailles, la continuité du pavage et la respiration du cadran témoignent d’une exigence où la montre devient bijou architectural.",
        "La Grand Lady Kalla n’est pas seulement un objet de vitrine : elle prolonge une vision où la haute horlogerie et la haute joaillerie partagent le même langage — celui du temps mesuré et du temps suspendu, entre éclat et discrétion.",
        "Pour le lecteur de La Gazette, ces créations rappellent que le Faubourg Saint-Honoré demeure un écrin où se rencontrent les maisons capables de porter une telle synthèse technique et poétique.",
      ],
    },
  ],
};

export function getArticlesForRubrique(slug: string) {
  const list = rubriqueArticlesBySlug[slug as RubriqueSlug];
  return list && list.length > 0 ? list : null;
}

export function getArticleBySlugs(
  rubriqueSlug: string,
  articleSlug: string,
): RubriqueSiteArticle | null {
  const list = rubriqueArticlesBySlug[rubriqueSlug as RubriqueSlug];
  if (!list) return null;
  return list.find((a) => a.articleSlug === articleSlug) ?? null;
}

export function generateArticleStaticParams(): { slug: string; articleSlug: string }[] {
  const out: { slug: string; articleSlug: string }[] = [];
  for (const [slug, articles] of Object.entries(rubriqueArticlesBySlug) as [
    RubriqueSlug,
    RubriqueSiteArticle[],
  ][]) {
    for (const a of articles) {
      out.push({ slug, articleSlug: a.articleSlug });
    }
  }
  return out;
}
