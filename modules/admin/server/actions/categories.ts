"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { requireAdmin } from "@/lib/server/admin-auth";

const categoryFields = z.object({
  title: z.string().min(1, "Titre requis"),
  slug: z.string().min(1).optional(),
  tagline: z.string().min(1),
  description: z.string().min(1),
  imageSrc: z.string().min(1, "Image requise"),
  imageAlt: z.string().min(1),
  sortOrder: z.coerce.number().int(),
  showInMainNav: z.boolean(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createCategory(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const raw = {
      title: formData.get("title"),
      slug: formData.get("slug") || undefined,
      tagline: formData.get("tagline"),
      description: formData.get("description"),
      imageSrc: formData.get("imageSrc"),
      imageAlt: formData.get("imageAlt"),
      sortOrder: formData.get("sortOrder") ?? "0",
      showInMainNav: formData.get("showInMainNav") === "on" || formData.get("showInMainNav") === "true",
    };
    const parsed = categoryFields.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
    }
    const { slug: slugInput, ...rest } = parsed.data;
    const slug = slugInput?.trim() || slugify(parsed.data.title);
    await prisma.category.create({
      data: {
        title: rest.title,
        tagline: rest.tagline,
        description: rest.description,
        imageSrc: rest.imageSrc,
        imageAlt: rest.imageAlt,
        sortOrder: rest.sortOrder,
        showInMainNav: rest.showInMainNav,
        slug,
      },
    });
    revalidatePath("/admin/categories");
    revalidatePath("/", "layout");
    revalidatePath("/[slug]", "page");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur";
    if (msg.includes("Unique constraint")) {
      return { ok: false, error: "Ce slug existe déjà." };
    }
    return { ok: false, error: msg };
  }
}

export async function updateCategory(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = formData.get("id");
    if (typeof id !== "string" || !id) return { ok: false, error: "ID manquant" };
    const raw = {
      title: formData.get("title"),
      slug: formData.get("slug") || undefined,
      tagline: formData.get("tagline"),
      description: formData.get("description"),
      imageSrc: formData.get("imageSrc"),
      imageAlt: formData.get("imageAlt"),
      sortOrder: formData.get("sortOrder") ?? "0",
      showInMainNav: formData.get("showInMainNav") === "on" || formData.get("showInMainNav") === "true",
    };
    const parsed = categoryFields.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
    }
    const { slug: slugInput, ...rest } = parsed.data;
    const slug = slugInput?.trim() || slugify(parsed.data.title);
    await prisma.category.update({
      where: { id },
      data: {
        title: rest.title,
        tagline: rest.tagline,
        description: rest.description,
        imageSrc: rest.imageSrc,
        imageAlt: rest.imageAlt,
        sortOrder: rest.sortOrder,
        showInMainNav: rest.showInMainNav,
        slug,
      },
    });
    revalidatePath("/admin/categories");
    revalidatePath("/", "layout");
    revalidatePath("/[slug]", "page");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur";
    if (msg.includes("Unique constraint")) {
      return { ok: false, error: "Ce slug existe déjà." };
    }
    return { ok: false, error: msg };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const count = await prisma.article.count({ where: { categoryId: id } });
    if (count > 0) {
      return {
        ok: false,
        error: `Impossible de supprimer : ${count} article(s) lié(s).`,
      };
    }
    await prisma.category.delete({ where: { id } });
    revalidatePath("/admin/categories");
    revalidatePath("/", "layout");
    revalidatePath("/[slug]", "page");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

