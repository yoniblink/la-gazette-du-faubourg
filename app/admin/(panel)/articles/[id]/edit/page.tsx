import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ArticleForm } from "@/components/admin/ArticleForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params;
  const [row, categories] = await Promise.all([
    prisma.article.findUnique({
      where: { id },
      include: { category: { select: { slug: true } } },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!row) notFound();

  const { category: articleCategory, ...article } = row;
  const articlesIndexHref = `/admin/articles?rubrique=${encodeURIComponent(articleCategory.slug)}`;

  const session = await auth();
  const userEmail = session?.user?.email ?? "";

  return (
    <div className="min-h-0">
      <h1 className="sr-only">Modifier l’article</h1>
      <ArticleForm
        key={article.id}
        userEmail={userEmail}
        article={article}
        categories={categories}
        articlesIndexHref={articlesIndexHref}
      />
    </div>
  );
}
