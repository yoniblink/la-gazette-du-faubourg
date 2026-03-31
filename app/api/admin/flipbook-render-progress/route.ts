import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFlipbookRenderProgress } from "@/lib/flipbook-render-progress";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const progress = await getFlipbookRenderProgress();
  return NextResponse.json(
    { progress },
    { headers: { "Cache-Control": "no-store" } },
  );
}
