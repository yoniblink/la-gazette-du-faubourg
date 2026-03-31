import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { site } from "@/lib/content/site";

const serif = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#fafafa",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.lagazettedufaubourg.fr"),
  title: {
    default: `${site.name} — Magazine du Faubourg Saint-Honoré`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: {
    title: `${site.name}`,
    description: site.description,
    locale: "fr_FR",
    type: "website",
    siteName: site.name,
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description: site.description,
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
      className={`${serif.variable} ${sans.variable} h-full scroll-smooth scroll-pt-[calc(5rem+env(safe-area-inset-top,0px))] antialiased md:scroll-pt-28`}
    >
      <body className="min-h-full bg-[#fafafa] text-[#0a0a0a]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
