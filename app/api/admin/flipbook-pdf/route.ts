import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HOME_FLIPBOOK_PDF_URL_KEY } from "@/lib/site-settings";

const MAX_BYTES = 40 * 1024 * 1024;

function isPdfFile(file: File): boolean {
  const mime = file.type || "";
  if (mime === "application/pdf" || mime === "application/x-pdf") return true;
  if (mime === "" || mime === "application/octet-stream") {
    return file.name.toLowerCase().endsWith(".pdf");
  }
  return false;
}

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
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 40 Mo)" },
      { status: 400 },
    );
  }
  if (!isPdfFile(file)) {
    return NextResponse.json({ error: "Un fichier PDF est requis" }, { status: 400 });
  }

  const original = file.name.replace(/[^\w.\-]+/g, "_") || "document";
  const ext = path.extname(original).toLowerCase() === ".pdf" ? ".pdf" : ".pdf";
  const base = path.basename(original, path.extname(original)).slice(0, 80) || "gazette";
  const unique = randomBytes(8).toString("hex");
  const filename = `${base}-${unique}${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const diskPath = path.join(uploadDir, filename);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(diskPath, buf);

  const url = `/uploads/${filename}`;

  await prisma.siteSetting.upsert({
    where: { key: HOME_FLIPBOOK_PDF_URL_KEY },
    create: { key: HOME_FLIPBOOK_PDF_URL_KEY, value: url },
    update: { value: url },
  });

  return NextResponse.json({ ok: true, url });
}
