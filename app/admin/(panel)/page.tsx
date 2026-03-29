import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [articleCount, categoryCount, mediaCount, recent] = await Promise.all([
    prisma.article.count(),
    prisma.category.count(),
    prisma.media.count(),
    prisma.article.findMany({
      take: 8,
      orderBy: { updatedAt: "desc" },
      include: { category: { select: { title: true, slug: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl font-light tracking-tight text-stone-900">
        Tableau de bord
      </h1>
      <p className="mt-2 text-sm text-stone-500">Vue d’ensemble du magazine</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <StatCard label="Articles" value={articleCount} href="/admin/articles" />
        <StatCard label="Rubriques" value={categoryCount} href="/admin/categories" />
        <StatCard label="Médias" value={mediaCount} href="/admin/media" />
      </div>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-stone-500">Articles récents</h2>
          <Link href="/admin/articles" className="text-xs text-stone-600 underline-offset-4 hover:underline">
            Tout voir
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {recent.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-stone-500">Aucun article pour le moment.</li>
          ) : (
            recent.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/articles/${a.id}/edit`}
                    className="font-medium text-stone-900 hover:underline"
                  >
                    {a.title}
                  </Link>
                  <p className="text-xs text-stone-500">
                    {a.category.title} · {a.status === "PUBLISHED" ? "Publié" : "Brouillon"}
                  </p>
                </div>
                <span className="text-xs tabular-nums text-stone-400">
                  {a.updatedAt.toLocaleDateString("fr-FR")}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-stone-200 bg-white p-6 transition-shadow hover:shadow-md"
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-serif)] text-4xl font-light tabular-nums text-stone-900">
        {value}
      </p>
    </Link>
  );
}
