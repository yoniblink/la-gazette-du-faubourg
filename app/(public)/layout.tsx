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
    <div className="flex min-h-[100dvh] min-w-0 w-full max-w-full flex-col overflow-x-clip">
      <IntroLoaderGate>
        <Header categories={nav} />
        <div className="flex min-h-0 flex-1 flex-col bg-[#fafafa]">{children}</div>
        <Footer categories={nav} />
      </IntroLoaderGate>
    </div>
  );
}
