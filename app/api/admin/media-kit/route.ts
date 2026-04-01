import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MEDIA_KIT_PDF_URL_KEY } from "@/lib/site-settings";
import {
  createSupabaseServiceRoleClient,
  getMediaKitStorageBucket,
  hasSupabaseMediaKitStorageEnv,
} from "@/lib/supabase-service";

const MAX_BYTES = 40 * 1024 * 1024;

function isOnVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

function isPdfFilename(name: string): boolean {
  return name.trim().toLowerCase().endsWith(".pdf");
}

function sanitizeUploadBase(name: string): string {
  const original = name.replace(/[^\w.\-]+/g, "_") || "document";
  return path.basename(original, path.extname(original)).slice(0, 80) || "media-kit";
}

function isAllowedMediaKitStoragePath(storagePath: string): boolean {
  if (!storagePath.startsWith("media-kit/")) return false;
  const parts = storagePath.split("/").filter(Boolean);
  if (parts.length < 3) return false;
  if (parts[0] !== "media-kit") return false;
  if (!/^[a-f0-9]{16}$/.test(parts[1] ?? "")) return false;
  return /\.pdf$/i.test(parts[parts.length - 1] ?? "");
}

function explainStorageError(message: string | undefined, bucket: string): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("does not exist") || m.includes("not found") || m.includes("bucket not found")) {
    return `Bucket Storage « ${bucket} » introuvable. Crée-le dans Supabase Storage (public) avec ce nom exact.`;
  }
  return message ?? "Erreur Storage Supabase.";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    let json: Record<string, unknown>;
    try {
      json = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
    }

    const action = typeof json.action === "string" ? json.action : "";

    if (action === "prepare") {
      const filename = typeof json.filename === "string" ? json.filename : "";
      const size = typeof json.size === "number" ? json.size : 0;
      if (!filename || size <= 0) return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
      if (size > MAX_BYTES) return NextResponse.json({ error: "Fichier trop volumineux (max 40 Mo)" }, { status: 400 });
      if (!isPdfFilename(filename)) return NextResponse.json({ error: "Un fichier PDF est requis" }, { status: 400 });

      if (!hasSupabaseMediaKitStorageEnv()) {
        if (isOnVercel()) {
          return NextResponse.json(
            {
              error:
                "Upload sur Vercel: configure SUPABASE_SERVICE_ROLE_KEY et un bucket public (ex: media-kit).",
            },
            { status: 503 },
          );
        }
        return NextResponse.json({ mode: "local" as const });
      }

      const admin = createSupabaseServiceRoleClient();
      const bucket = getMediaKitStorageBucket();
      if (!admin) return NextResponse.json({ error: "Configuration Storage incomplète" }, { status: 500 });

      const folder = randomBytes(8).toString("hex");
      const base = sanitizeUploadBase(filename);
      const unique = randomBytes(8).toString("hex");
      const storagePath = `media-kit/${folder}/${base}-${unique}.pdf`;

      const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(storagePath, { upsert: true });
      if (error || !data) {
        return NextResponse.json({ error: explainStorageError(error?.message, bucket) }, { status: 500 });
      }

      return NextResponse.json({
        mode: "supabase" as const,
        bucket,
        path: data.path,
        token: data.token,
      });
    }

    if (action === "commit") {
      const storagePath = typeof json.path === "string" ? json.path : "";
      if (!storagePath || !isAllowedMediaKitStoragePath(storagePath)) {
        return NextResponse.json({ error: "Chemin invalide" }, { status: 400 });
      }
      if (!hasSupabaseMediaKitStorageEnv()) {
        return NextResponse.json({ error: "Configuration Storage absente" }, { status: 503 });
      }
      const admin = createSupabaseServiceRoleClient();
      const bucket = getMediaKitStorageBucket();
      if (!admin) return NextResponse.json({ error: "Configuration Storage incomplète" }, { status: 500 });

      const { data: pub } = admin.storage.from(bucket).getPublicUrl(storagePath);
      const publicUrl = pub.publicUrl;
      await prisma.siteSetting.upsert({
        where: { key: MEDIA_KIT_PDF_URL_KEY },
        create: { key: MEDIA_KIT_PDF_URL_KEY, value: publicUrl },
        update: { value: publicUrl },
      });
      return NextResponse.json({ ok: true as const, url: publicUrl });
    }

    if (action === "clear") {
      await prisma.siteSetting.deleteMany({ where: { key: MEDIA_KIT_PDF_URL_KEY } });
      return NextResponse.json({ ok: true as const });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  if (isOnVercel()) {
    return NextResponse.json(
      { error: "Envoi direct non supporté sur Vercel. Utilise le flux Supabase (prepare + upload signé + commit)." },
      { status: 415 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formulaire invalide" }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Fichier trop volumineux (max 40 Mo)" }, { status: 400 });
  if (!isPdfFilename(file.name)) return NextResponse.json({ error: "Un fichier PDF est requis" }, { status: 400 });

  const base = sanitizeUploadBase(file.name);
  const unique = randomBytes(8).toString("hex");
  const filename = `${base}-${unique}.pdf`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const diskPath = path.join(uploadDir, filename);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(diskPath, buf);
  const url = `/uploads/${filename}`;

  await prisma.siteSetting.upsert({
    where: { key: MEDIA_KIT_PDF_URL_KEY },
    create: { key: MEDIA_KIT_PDF_URL_KEY, value: url },
    update: { value: url },
  });

  return NextResponse.json({ ok: true as const, url });
}
