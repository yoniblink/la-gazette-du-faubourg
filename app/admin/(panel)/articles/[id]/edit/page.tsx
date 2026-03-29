import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { DeleteArticleButton } from "@/components/admin/DeleteArticleButton";

type Props = { params: Promise<{ id: string }> };

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params;
  const [article, categories] = await Promise.all([
    prisma.article.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/articles" className="text-xs text-stone-500 hover:text-stone-800">
        ← Articles
      </Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-[family-name:var(--font-serif)] text-3xl font-light text-stone-900">
          Modifier l’article
        </h1>
        <DeleteArticleButton id={article.id} title={article.title} />
      </div>
      <div className="mt-10 rounded-xl border border-stone-200 bg-white p-8">
        <ArticleForm key={article.id} article={article} categories={categories} />
      </div>
    </div>
  );
}
