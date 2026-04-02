import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "unzipper"],
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      {
        source: "/rencontres/3-questions-a-john-nollet-directeur-artistique-maison-carila",
        destination: "/rencontres/3-questions-a-john-nollet-directeur-artistique-maison-carita",
        permanent: true,
      },
      { source: "/rubrique/rencontre", destination: "/rencontres", permanent: true },
      { source: "/rubrique/:slug", destination: "/:slug", permanent: true },
      { source: "/categorie/:slug", destination: "/:slug", permanent: true },
    ];
  },
  images: {
    qualities: [75, 100],
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
