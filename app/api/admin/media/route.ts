import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_ITEMS = 300;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const items = await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
    take: MAX_ITEMS,
    select: { id: true, url: true, filename: true, alt: true, mimeType: true },
  });

  return NextResponse.json({ items });
}
