import type { Metadata } from "next";
import { NewsletterSubscribe } from "@/components/sections/NewsletterSubscribe";
import { site } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Newsletter",
  description: `Inscrivez-vous à la newsletter de ${site.name} — actualités du Faubourg Saint-Honoré.`,
  openGraph: {
    title: `Newsletter | ${site.name}`,
    description: `Recevez les actualités de ${site.name}.`,
    locale: "fr_FR",
  },
  alternates: {
    canonical: "/newsletter",
  },
};

export default function NewsletterPage() {
  return (
    <main className="bg-[#fafafa] pt-14 pb-24 md:pt-16 md:pb-32">
      <NewsletterSubscribe />
    </main>
  );
}
