import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteCategoryButton } from "@/components/admin/DeleteCategoryButton";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-serif)] text-3xl font-light tracking-tight text-stone-900">
            Rubriques
          </h1>
          <p className="mt-2 text-sm text-stone-500">Catégories éditoriales du magazine</p>
        </div>
        <Link
          href="/admin/categories/new"
          className="rounded-lg bg-stone-900 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-white hover:opacity-90"
        >
          Nouvelle rubrique
        </Link>
      </div>

      <div className="mt-10 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-[11px] font-medium uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-4 py-3">Titre</th>
              <th className="hidden px-4 py-3 md:table-cell">Slug</th>
              <th className="px-4 py-3">Menu</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-stone-50/80">
                <td className="px-4 py-3 font-medium text-stone-900">{c.title}</td>
                <td className="hidden px-4 py-3 font-mono text-xs text-stone-500 md:table-cell">{c.slug}</td>
                <td className="px-4 py-3 text-stone-600">{c.showInMainNav ? "Oui" : "Non"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/categories/${c.id}/edit`} className="text-xs text-stone-700 underline-offset-2 hover:underline">
                    Modifier
                  </Link>
                  <span className="mx-2 text-stone-300">|</span>
                  <DeleteCategoryButton id={c.id} label={c.title} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
