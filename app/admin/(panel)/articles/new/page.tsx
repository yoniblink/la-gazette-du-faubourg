import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArticleForm } from "@/components/admin/ArticleForm";

export default async function NewArticlePage() {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  if (categories.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-8 text-sm text-amber-950">
        Créez d’abord une rubrique dans l’administration.
        <Link href="/admin/categories/new" className="mt-4 block font-medium underline">
          Nouvelle rubrique
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/articles" className="text-xs text-stone-500 hover:text-stone-800">
        ← Articles
      </Link>
      <h1 className="mt-6 font-[family-name:var(--font-serif)] text-3xl font-light text-stone-900">
        Nouvel article
      </h1>
      <div className="mt-10 rounded-xl border border-stone-200 bg-white p-8">
        <ArticleForm key="new" categories={categories} />
      </div>
    </div>
  );
}
