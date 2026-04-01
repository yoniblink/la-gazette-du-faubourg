import type { Metadata, Viewport } from "next";
import { Roboto_Slab } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { site } from "@/lib/content/site";

/** Roboto Slab : pas embarqué dans le HTML Elementor, chargement Google comme avant. */
const serif = Roboto_Slab({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#fafafa",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.lagazettedufaubourg.fr"),
  title: {
    default: site.officialTitle,
    template: `%s | ${site.name}`,
  },
  description: site.officialTitle,
  icons: {
    icon: site.navbarLogoSrc,
    shortcut: site.navbarLogoSrc,
    apple: site.navbarLogoSrc,
  },
  openGraph: {
    title: site.name,
    description: site.officialTitle,
    url: site.url,
    locale: "fr_FR",
    type: "website",
    siteName: site.name,
    images: [
      {
        url: site.navbarLogoSrc,
        width: 180,
        height: 180,
        alt: site.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description: site.officialTitle,
    images: [site.navbarLogoSrc],
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${serif.variable} h-full scroll-smooth scroll-pt-20 antialiased md:scroll-pt-24`}
    >
      <body className="min-h-full bg-[#fafafa] text-[#0a0a0a]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
