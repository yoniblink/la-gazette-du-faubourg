"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Category } from "@prisma/client";
import { createCategory, updateCategory, type ActionResult } from "@/app/admin/(panel)/categories/actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-stone-900 px-5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Enregistrement…" : label}
    </button>
  );
}

export function CategoryForm({
  category,
}: {
  category?: Category;
}) {
  const router = useRouter();
  const isEdit = Boolean(category);
  const action = isEdit ? updateCategory : createCategory;
  const [state, formAction] = useActionState(action, null as ActionResult | null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(isEdit ? "Rubrique mise à jour." : "Rubrique créée.");
      router.push("/admin/categories");
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, isEdit, router]);

  return (
    <form action={formAction} className="mx-auto max-w-xl space-y-6">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">Titre</label>
        <input
          name="title"
          required
          defaultValue={category?.title}
          className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
          Slug (optionnel, auto depuis le titre)
        </label>
        <input
          name="slug"
          defaultValue={category?.slug}
          className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-mono text-sm"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">Sous-titre</label>
        <input
          name="tagline"
          required
          defaultValue={category?.tagline}
          className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">Description</label>
        <textarea
          name="description"
          required
          rows={4}
          defaultValue={category?.description}
          className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
          URL image de couverture
        </label>
        <input
          name="imageSrc"
          required
          defaultValue={category?.imageSrc}
          className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">Alt image</label>
        <input
          name="imageAlt"
          required
          defaultValue={category?.imageAlt}
          className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">Ordre d’affichage</label>
        <input
          name="sortOrder"
          type="number"
          defaultValue={category?.sortOrder ?? 0}
          className="mt-2 w-32 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          name="showInMainNav"
          value="on"
          defaultChecked={category?.showInMainNav ?? true}
          className="rounded border-stone-300"
        />
        Afficher dans le menu principal
      </label>
      <div className="flex flex-wrap gap-3 pt-2">
        <Submit label={isEdit ? "Enregistrer" : "Créer"} />
        <Link
          href="/admin/categories"
          className="inline-flex items-center rounded-lg border border-stone-200 px-5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-stone-600 hover:bg-stone-50"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
