import { Hero } from "@/components/sections/Hero";
import { HomeVideo } from "@/components/sections/HomeVideo";
import { Featured } from "@/components/sections/Featured";
import { InstagramStrip } from "@/components/sections/InstagramStrip";
import { PrintRevue } from "@/components/sections/PrintRevue";
import { HomeFlipbook } from "@/components/sections/HomeFlipbook";
import { NewsletterSection } from "@/components/sections/NewsletterSection";
import { featuredArticles } from "@/lib/content/featured";
import { getFeaturedArticlesForHome } from "@/lib/data/articles";
import { hasDatabaseUrl } from "@/lib/prisma";
import { getHomeFlipbookManifest, getHomeFlipbookPdfUrl } from "@/lib/site-settings";

export default async function Home() {
  const flipbookPdfUrl = hasDatabaseUrl() ? await getHomeFlipbookPdfUrl() : null;
  const flipbookManifest = hasDatabaseUrl() ? await getHomeFlipbookManifest() : null;

  const featuredItems = hasDatabaseUrl()
    ? (await getFeaturedArticlesForHome(8)).map((a) => ({
        id: a.id,
        rubrique: a.category.title,
        title: a.title,
        excerpt: a.excerpt,
        imageSrc: a.coverImageUrl,
        imageAlt: a.coverImageAlt,
        href: `/${a.category.slug}/${a.slug}`,
        layout: a.layout === "lead" ? ("lead" as const) : ("standard" as const),
      }))
    : featuredArticles.map((a) => ({
        id: a.id,
        rubrique: a.rubrique,
        title: a.title,
        excerpt: a.excerpt,
        imageSrc: a.imageSrc,
        imageAlt: a.imageAlt,
        href: a.href,
        layout: a.layout,
      }));

  return (
    <>
      <Hero />
      <HomeVideo />
      <Featured items={featuredItems} />
      <InstagramStrip />
      <PrintRevue />
      {flipbookPdfUrl ? (
        <HomeFlipbook pdfUrl={flipbookPdfUrl} initialManifest={flipbookManifest} />
      ) : null}
      <NewsletterSection />
    </>
  );
}
