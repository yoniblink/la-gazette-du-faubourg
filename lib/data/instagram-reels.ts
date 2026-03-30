import { tryPrisma } from "@/lib/prisma";

export type InstagramReelPublic = {
  id: string;
  videoUrl: string;
  posterUrl: string | null;
  caption: string | null;
  sortOrder: number;
};

export async function getInstagramReelsForHome(): Promise<InstagramReelPublic[]> {
  const db = tryPrisma();
  if (!db) return [];
  try {
    const rows = await db.instagramReel.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      videoUrl: r.videoUrl,
      posterUrl: r.posterUrl,
      caption: r.caption,
      sortOrder: r.sortOrder,
    }));
  } catch {
    return [];
  }
}
