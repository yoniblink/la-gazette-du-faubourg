"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Article, Category } from "@prisma/client";
import type { JSONContent } from "@tiptap/core";
import { TipTapEditor } from "@/components/admin/TipTapEditor";
import { createArticle, updateArticle, type ArticleActionResult } from "@/app/admin/(panel)/articles/actions";
import { emptyTipTapDoc } from "@/lib/tiptap/empty-doc";

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

export function ArticleForm({
  article,
  categories,
}: {
  article?: Article;
  categories: Category[];
}) {
  const router = useRouter();
  const isEdit = Boolean(article);
  const action = isEdit ? updateArticle : createArticle;
  const [state, formAction] = useActionState(action, null as ArticleActionResult | null);

  const [contentJson, setContentJson] = useState<JSONContent>(() => {
    if (article?.content && typeof article.content === "object") {
      return article.content as JSONContent;
    }
    return structuredClone(emptyTipTapDoc) as unknown as JSONContent;
  });

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(isEdit ? "Article enregistré." : "Article créé.");
      router.push("/admin/articles");
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, isEdit, router]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("content", JSON.stringify(contentJson));
        startTransition(() => {
          formAction(fd);
        });
      }}
      className="space-y-8"
    >
      {article ? <input type="hidden" name="id" value={article.id} /> : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">Titre</label>
          <input
            name="title"
            required
            defaultValue={article?.title}
            className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
            Slug (optionnel)
          </label>
          <input
            name="slug"
            defaultValue={article?.slug}
            className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">Rubrique</label>
          <select
            name="categoryId"
            required
            defaultValue={article?.categoryId}
            className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">Kicker</label>
          <input
            name="kicker"
            defaultValue={article?.kicker ?? ""}
            className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">Auteur</label>
          <input
            name="authorName"
            defaultValue={article?.authorName ?? "La Gazette"}
            className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">Chapô</label>
          <textarea
            name="excerpt"
            required
            rows={3}
            defaultValue={article?.excerpt}
            className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
            Image de couverture (URL)
          </label>
          <input
            name="coverImageUrl"
            required
            defaultValue={article?.coverImageUrl}
            className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">Alt image</label>
          <input
            name="coverImageAlt"
            required
            defaultValue={article?.coverImageAlt}
            className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-stone-500">Corps</label>
        <TipTapEditor key={article?.id ?? "new"} initial={contentJson} onChange={setContentJson} />
      </div>

      <div className="grid gap-6 border-t border-stone-200 pt-8 md:grid-cols-2">
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">SEO — titre</label>
          <input
            name="seoTitle"
            defaultValue={article?.seoTitle ?? ""}
            className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
            SEO — description
          </label>
          <textarea
            name="seoDescription"
            rows={2}
            defaultValue={article?.seoDescription ?? ""}
            className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
            URL source (magazine en ligne)
          </label>
          <input
            name="sourceUrl"
            defaultValue={article?.sourceUrl ?? ""}
            className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <fieldset className="md:col-span-2">
          <legend className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Mise en page carte</legend>
          <div className="mt-2 flex gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="layout"
                value="standard"
                defaultChecked={article?.layout !== "lead"}
              />
              Standard
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="layout" value="lead" defaultChecked={article?.layout === "lead"} />
              Pleine largeur (accueil)
            </label>
          </div>
        </fieldset>
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500">
            Ordre à l’accueil
          </label>
          <input
            name="featuredSortOrder"
            type="number"
            defaultValue={article?.featuredSortOrder ?? 0}
            className="mt-2 w-32 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col justify-end gap-3 pb-1">
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="publish"
              value="on"
              defaultChecked={article?.status === "PUBLISHED"}
              className="rounded border-stone-300"
            />
            Publié
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name="featuredOnHome"
              value="on"
              defaultChecked={article?.featuredOnHome ?? false}
              className="rounded border-stone-300"
            />
            Afficher à l’accueil
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-4">
        <Submit label={isEdit ? "Enregistrer" : "Créer"} />
        <Link
          href="/admin/articles"
          className="inline-flex items-center rounded-lg border border-stone-200 px-5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-stone-600 hover:bg-stone-50"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
