import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formulaire invalide" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 8 Mo)" }, { status: 400 });
  }
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED.has(mimeType)) {
    return NextResponse.json({ error: "Type non autorisé" }, { status: 400 });
  }

  const original = file.name.replace(/[^\w.\-]+/g, "_") || "image";
  const ext = path.extname(original) || (mimeType === "image/png" ? ".png" : ".jpg");
  const base = path.basename(original, ext).slice(0, 80);
  const unique = randomBytes(8).toString("hex");
  const filename = `${base}-${unique}${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const diskPath = path.join(uploadDir, filename);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(diskPath, buf);

  const url = `/uploads/${filename}`;
  const altRaw = formData.get("alt");
  const alt = typeof altRaw === "string" && altRaw.trim() ? altRaw.trim() : null;

  const row = await prisma.media.create({
    data: {
      url,
      filename,
      mimeType,
      alt: alt || null,
    },
  });

  return NextResponse.json({ ok: true, url, id: row.id, media: row });
}
