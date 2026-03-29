import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { IntroLoaderGate } from "@/components/intro/IntroLoaderGate";
import { getCategoriesOrdered } from "@/lib/data/categories";

export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const categories = await getCategoriesOrdered();
  const nav = categories.map((c) => ({ slug: c.slug, title: c.title }));

  return (
    <IntroLoaderGate>
      <Header categories={nav} />
      {children}
      <Footer categories={nav} />
    </IntroLoaderGate>
  );
}
