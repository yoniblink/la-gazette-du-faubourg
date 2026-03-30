"use server";

import { unlink } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/admin-auth";
import { createSupabaseServiceRoleClient, getMediaStorageBucket } from "@/lib/supabase-service";
import { parseSupabaseStoragePublicUrl } from "@/lib/supabase-storage-public-url";

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
    } else {
      const parsed = parseSupabaseStoragePublicUrl(row.url);
      const admin = createSupabaseServiceRoleClient();
      const bucket = getMediaStorageBucket();
      if (parsed && admin && parsed.bucket === bucket) {
        await admin.storage.from(parsed.bucket).remove([parsed.objectPath]);
      }
    }
    await prisma.media.delete({ where: { id } });
    revalidatePath("/admin/media");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}
