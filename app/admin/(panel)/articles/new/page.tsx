import Link from "next/link";
import { auth } from "@/auth";
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

  const session = await auth();
  const userEmail = session?.user?.email ?? "";

  return (
    <div className="min-h-0">
      <h1 className="sr-only">Nouvel article</h1>
      <ArticleForm key="new" userEmail={userEmail} categories={categories} />
    </div>
  );
}
