import Link from "next/link";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default function NewCategoryPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/categories" className="text-xs text-stone-500 hover:text-stone-800">
        ← Rubriques
      </Link>
      <h1 className="mt-6 font-[family-name:var(--font-serif)] text-3xl font-light text-stone-900">
        Nouvelle rubrique
      </h1>
      <div className="mt-10 rounded-xl border border-stone-200 bg-white p-8">
        <CategoryForm />
      </div>
    </div>
  );
}
