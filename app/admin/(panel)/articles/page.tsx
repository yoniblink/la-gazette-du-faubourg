import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Props = { searchParams: Promise<{ rubrique?: string }> };

export default async function AdminArticlesPage({ searchParams }: Props) {
  const { rubrique: rubriqueSlug } = await searchParams;

  if (!rubriqueSlug?.trim()) {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { articles: true } } },
    });

    return (
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-serif)] text-3xl font-light tracking-tight text-stone-900">
              Articles
            </h1>
            <p className="mt-2 text-sm text-stone-500">Choisissez une rubrique pour gérer ses articles</p>
          </div>
          <Link
            href="/admin/articles/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-stone-900 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-white hover:opacity-90 max-[768px]:w-full min-[769px]:w-auto"
          >
            Nouvel article
          </Link>
        </div>

        {categories.length === 0 ? (
          <p className="mt-10 rounded-xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
            Aucune rubrique.{" "}
            <Link href="/admin/categories/new" className="font-medium text-stone-800 underline-offset-2 hover:underline">
              Créer une rubrique
            </Link>
          </p>
        ) : (
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/articles?rubrique=${encodeURIComponent(c.slug)}`}
                  className="flex flex-col rounded-xl border border-stone-200 bg-white p-5 transition-colors hover:border-stone-300 hover:bg-stone-50/80"
                >
                  <span className="font-[family-name:var(--font-serif)] text-lg font-light text-stone-900">
                    {c.title}
                  </span>
                  <span className="mt-1 text-xs text-stone-500">
                    {c._count.articles} article{c._count.articles === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const category = await prisma.category.findUnique({
    where: { slug: rubriqueSlug.trim() },
  });

  if (!category) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="font-[family-name:var(--font-serif)] text-2xl font-light text-stone-900">Rubrique introuvable</h1>
        <p className="mt-2 text-sm text-stone-500">Ce lien ne correspond à aucune rubrique.</p>
        <Link
          href="/admin/articles"
          className="mt-6 inline-block text-sm font-medium text-stone-800 underline-offset-2 hover:underline"
        >
          ← Retour aux rubriques
        </Link>
      </div>
    );
  }

  const articles = await prisma.article.findMany({
    where: { categoryId: category.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/admin/articles"
            className="text-[11px] font-medium uppercase tracking-wider text-stone-500 underline-offset-4 hover:text-stone-800 hover:underline"
          >
            ← Toutes les rubriques
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-serif)] text-3xl font-light tracking-tight text-stone-900">
            {category.title}
          </h1>
          <p className="mt-2 text-sm text-stone-500">Articles de cette rubrique</p>
        </div>
        <Link
          href={`/admin/articles/new?rubrique=${encodeURIComponent(category.slug)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-stone-900 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-white hover:opacity-90 max-[768px]:w-full min-[769px]:w-auto"
        >
          Nouvel article
        </Link>
      </div>

      <div className="mt-10 overflow-x-auto rounded-xl border border-stone-200 bg-white max-[768px]:-mx-1">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-[11px] font-medium uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-4 py-3">Titre</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Modifié</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {articles.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-stone-500">
                  Aucun article dans cette rubrique.{" "}
                  <Link
                    href={`/admin/articles/new?rubrique=${encodeURIComponent(category.slug)}`}
                    className="font-medium text-stone-800 underline-offset-2 hover:underline"
                  >
                    En créer un
                  </Link>
                </td>
              </tr>
            ) : (
              articles.map((a) => (
                <tr key={a.id} className="hover:bg-stone-50/80">
                  <td className="max-w-[260px] truncate px-4 py-3 font-medium text-stone-900">{a.title}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                        a.status === "PUBLISHED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {a.status === "PUBLISHED" ? "Publié" : "Brouillon"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-stone-400">
                    {a.updatedAt.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/${category.slug}/${a.slug}?edit=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-stone-700 underline-offset-2 hover:underline"
                    >
                      Modifier
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
