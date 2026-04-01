import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "unzipper"],
  async redirects() {
    return [
      { source: "/rubrique/rencontre", destination: "/rencontres", permanent: true },
      { source: "/rubrique/:slug", destination: "/:slug", permanent: true },
      { source: "/categorie/:slug", destination: "/:slug", permanent: true },
    ];
  },
  images: {
    /** 70 : variante un peu plus légère pour les gros visuels (cached egress). */
    qualities: [70, 75, 100],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.lagazettedufaubourg.fr",
        pathname: "/wp-content/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
