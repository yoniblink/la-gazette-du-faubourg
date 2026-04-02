import type { Metadata } from "next";
import { NewsletterSubscribeForm } from "@/components/sections/NewsletterSubscribeForm";
import { site } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Newsletter",
  description: `Inscrivez-vous à la newsletter de ${site.name} — actualités du Faubourg et nouvelles parutions.`,
  openGraph: {
    title: `Newsletter | ${site.name}`,
    description: `Inscrivez-vous à la newsletter de ${site.name}.`,
    locale: "fr_FR",
  },
  alternates: {
    canonical: "/newsletter",
  },
};

export default function NewsletterPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col bg-white pt-20 pb-20 max-[768px]:px-0 max-[768px]:pt-[4.5rem] md:pt-24 md:pb-24">
      <article className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10 max-[768px]:px-4 max-[768px]:py-8 md:px-10 md:py-14">
        <NewsletterSubscribeForm />
      </article>
    </main>
  );
}
