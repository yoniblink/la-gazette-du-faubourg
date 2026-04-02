"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/admin-auth";
import { parseSupabaseStoragePublicUrl } from "@/lib/supabase-storage-public-url";
import { createSupabaseServiceRoleClient, getInstagramReelsStorageBucket } from "@/lib/supabase-service";

async function removeStorageObjectsForUrls(urls: (string | null | undefined)[]) {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) return;
  const expectedBucket = getInstagramReelsStorageBucket();
  const pathsByBucket = new Map<string, string[]>();
  for (const u of urls) {
    if (!u?.startsWith("https://")) continue;
    const parsed = parseSupabaseStoragePublicUrl(u);
    if (!parsed || parsed.bucket !== expectedBucket) continue;
    const list = pathsByBucket.get(parsed.bucket) ?? [];
    list.push(parsed.objectPath);
    pathsByBucket.set(parsed.bucket, list);
  }
  for (const [bucket, paths] of pathsByBucket) {
    if (paths.length === 0) continue;
    const { error } = await admin.storage.from(bucket).remove(paths);
    if (error) console.error("[instagram-reels] storage remove", error.message);
  }
}

export async function deleteInstagramReel(id: string) {
  await requireAdmin();
  const reel = await prisma.instagramReel.findUnique({ where: { id } });
  if (!reel) return { ok: false as const, error: "Introuvable" };

  await removeStorageObjectsForUrls([reel.videoUrl, reel.posterUrl]);
  await prisma.instagramReel.delete({ where: { id } });
  revalidatePath("/admin/instagram-reels");
  revalidatePath("/");
  return { ok: true as const };
}

export async function moveInstagramReel(id: string, direction: "up" | "down") {
  await requireAdmin();
  const rows = await prisma.instagramReel.findMany({
    orderBy: { sortOrder: "asc" },
  });
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return { ok: false as const, error: "Introuvable" };
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= rows.length) {
    return { ok: true as const };
  }

  const a = rows[idx]!;
  const b = rows[swapWith]!;
  await prisma.$transaction([
    prisma.instagramReel.update({
      where: { id: a.id },
      data: { sortOrder: b.sortOrder },
    }),
    prisma.instagramReel.update({
      where: { id: b.id },
      data: { sortOrder: a.sortOrder },
    }),
  ]);
  revalidatePath("/admin/instagram-reels");
  revalidatePath("/");
  return { ok: true as const };
}

export async function updateInstagramReelCaption(id: string, caption: string) {
  await requireAdmin();
  const trimmed = caption.trim().slice(0, 280);
  await prisma.instagramReel.update({
    where: { id },
    data: { caption: trimmed || null },
  });
  revalidatePath("/admin/instagram-reels");
  revalidatePath("/");
  return { ok: true as const };
}

