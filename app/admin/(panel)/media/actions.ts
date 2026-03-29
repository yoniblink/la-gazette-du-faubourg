"use server";

import { unlink } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/admin-auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function deleteMedia(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const row = await prisma.media.findUnique({ where: { id } });
    if (!row) return { ok: false, error: "Média introuvable" };
    if (row.url.startsWith("/uploads/")) {
      const diskPath = path.join(process.cwd(), "public", row.url);
      try {
        await unlink(diskPath);
      } catch {
        /* file may already be gone */
      }
    }
    await prisma.media.delete({ where: { id } });
    revalidatePath("/admin/media");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}
