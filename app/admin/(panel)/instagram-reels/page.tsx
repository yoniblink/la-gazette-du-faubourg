import { InstagramReelsAdmin } from "@/components/admin/InstagramReelsAdmin";
import { hasInstagramReelsStorageEnv } from "@/lib/supabase-service";
import { prisma } from "@/lib/prisma";

export default async function AdminInstagramReelsPage() {
  let reels: Awaited<ReturnType<typeof prisma.instagramReel.findMany>> = [];
  try {
    reels = await prisma.instagramReel.findMany({
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    reels = [];
  }

  return (
    <InstagramReelsAdmin initialReels={reels} storageConfigured={hasInstagramReelsStorageEnv()} />
  );
}
