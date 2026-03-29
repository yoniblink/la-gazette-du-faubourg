import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminArticlesPage() {
  const articles = await prisma.article.findMany({
    orderBy: { updatedAt: "desc" },
    include: { category: { select: { title: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-serif)] text-3xl font-light tracking-tight text-stone-900">
            Articles
          </h1>
          <p className="mt-2 text-sm text-stone-500">Créer, modifier et publier</p>
        </div>
        <Link
          href="/admin/articles/new"
          className="rounded-lg bg-stone-900 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-white hover:opacity-90"
        >
          Nouvel article
        </Link>
      </div>

      <div className="mt-10 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-[11px] font-medium uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-4 py-3">Titre</th>
              <th className="px-4 py-3">Rubrique</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Modifié</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {articles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-stone-500">
                  Aucun article. Créez-en un pour commencer.
                </td>
              </tr>
            ) : (
              articles.map((a) => (
                <tr key={a.id} className="hover:bg-stone-50/80">
                  <td className="max-w-[220px] truncate px-4 py-3 font-medium text-stone-900">{a.title}</td>
                  <td className="px-4 py-3 text-stone-600">{a.category.title}</td>
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
                      href={`/admin/articles/${a.id}/edit`}
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
