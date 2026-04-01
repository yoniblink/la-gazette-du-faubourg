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
    title: `${site.name}`,
    description: site.officialTitle,
    locale: "fr_FR",
    type: "website",
    siteName: site.name,
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description: site.officialTitle,
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
      className={`${serif.variable} ${sans.variable} h-full scroll-smooth scroll-pt-20 antialiased md:scroll-pt-24`}
    >
      <body className="min-h-full bg-[#fafafa] text-[#0a0a0a]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
