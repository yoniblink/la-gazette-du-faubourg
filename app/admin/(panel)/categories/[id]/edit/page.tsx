import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CategoryForm } from "@/components/admin/CategoryForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/categories" className="text-xs text-stone-500 hover:text-stone-800">
        ← Rubriques
      </Link>
      <h1 className="mt-6 font-[family-name:var(--font-serif)] text-3xl font-light text-stone-900">
        Modifier la rubrique
      </h1>
      <div className="mt-10 rounded-xl border border-stone-200 bg-white p-8">
        <CategoryForm category={category} />
      </div>
    </div>
  );
}
