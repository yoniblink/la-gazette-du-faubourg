import { NextResponse } from "next/server";
import { getHomeFlipbookManifest } from "@/lib/site-settings";

/** Manifest public (URLs déjà publiques dans le storage). */
export async function GET() {
  const manifest = await getHomeFlipbookManifest();
  return NextResponse.json(
    { manifest },
    { headers: { "Cache-Control": "no-store" } },
  );
}
