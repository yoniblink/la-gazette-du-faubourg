import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas", "sharp"],
  async redirects() {
    return [
      { source: "/rubrique/rencontre", destination: "/rencontres", permanent: true },
      { source: "/rubrique/:slug", destination: "/:slug", permanent: true },
      { source: "/categorie/:slug", destination: "/:slug", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
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
