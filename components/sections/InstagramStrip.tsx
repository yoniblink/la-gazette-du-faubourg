import { getInstagramReelsForHome } from "@/lib/data/instagram-reels";
import { InstagramStripContent } from "@/components/sections/InstagramStripContent";

export async function InstagramStrip() {
  const reels = await getInstagramReelsForHome();
  return <InstagramStripContent reels={reels} />;
}
