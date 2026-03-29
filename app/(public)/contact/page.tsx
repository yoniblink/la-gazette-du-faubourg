import type { Metadata } from "next";
import { Contact } from "@/components/sections/Contact";
import { site } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contacter ${site.name} — rédaction, annonces, partenariats.`,
  openGraph: {
    title: `Contact | ${site.name}`,
    description: `Contacter ${site.name} — rédaction, annonces, partenariats.`,
    locale: "fr_FR",
  },
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return <Contact />;
}
