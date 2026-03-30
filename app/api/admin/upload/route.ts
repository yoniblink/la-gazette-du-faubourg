import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createSupabaseServiceRoleClient,
  getMediaStorageBucket,
  hasSupabaseMediaStorageEnv,
} from "@/lib/supabase-service";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function isOnVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

function sanitizeFilename(original: string, mimeType: string): { base: string; ext: string } {
  const safe = original.replace(/[^\w.\-]+/g, "_") || "image";
  const ext =
    path.extname(safe) || (mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg");
  const base = path.basename(safe, ext).slice(0, 80) || "image";
  return { base, ext };
}

function isAllowedMediaStoragePath(storagePath: string): boolean {
  if (!storagePath.startsWith("admin-media/")) return false;
  const parts = storagePath.split("/").filter(Boolean);
  if (parts.length < 3) return false;
  if (parts[0] !== "admin-media") return false;
  if (!/^[a-f0-9]{16}$/.test(parts[1] ?? "")) return false;
  return /\.(jpe?g|png|webp|gif)$/i.test(parts[parts.length - 1] ?? "");
}

function storageErrorHint(message: string | undefined, bucket: string): string {
  const m = (message ?? "").toLowerCase();
  if (
    m.includes("does not exist") ||
    m.includes("not found") ||
    m.includes("bucket not found")
  ) {
    return `Bucket Storage « ${bucket} » introuvable. Créez-le dans Supabase (nom exact, public). Voir supabase/storage-site-media-setup.sql.`;
  }
  return message ?? "Erreur Storage Supabase.";
}

/** JSON : prepare (URL signée) | commit (ligne Media après upload client). */
async function handleJson(req: Request): Promise<NextResponse> {
  let json: Record<string, unknown>;
  try {
    json = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const action = typeof json.action === "string" ? json.action : "";

  if (action === "prepare") {
    const filename = typeof json.filename === "string" ? json.filename : "";
    const contentType = typeof json.contentType === "string" ? json.contentType : "";
    const size = typeof json.size === "number" ? json.size : 0;
    const mime = contentType || "application/octet-stream";

    if (!filename || size <= 0) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }
    if (size > MAX_BYTES) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 8 Mo)" }, { status: 400 });
    }
    if (!ALLOWED.has(mime)) {
      return NextResponse.json({ error: "Type non autorisé" }, { status: 400 });
    }

    if (!hasSupabaseMediaStorageEnv()) {
      if (isOnVercel()) {
        return NextResponse.json(
          {
            error:
              "Médias sur Vercel : ajoutez NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et le bucket (ex. site-media). Voir .env.example et supabase/storage-site-media-setup.sql.",
          },
          { status: 503 },
        );
      }
      return NextResponse.json({ mode: "local" as const });
    }

    const admin = createSupabaseServiceRoleClient();
    const bucket = getMediaStorageBucket();
    if (!admin) {
      return NextResponse.json({ error: "Configuration Storage incomplète" }, { status: 500 });
    }

    const { base, ext } = sanitizeFilename(filename, mime);
    const folder = randomBytes(8).toString("hex");
    const unique = randomBytes(8).toString("hex");
    const storagePath = `admin-media/${folder}/${base}-${unique}${ext}`;

    const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(storagePath, {
      upsert: true,
    });

    if (error || !data) {
      console.error("[admin/upload] createSignedUploadUrl", error?.message);
      return NextResponse.json(
        { error: storageErrorHint(error?.message, bucket) },
        { status: 500 },
      );
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
    const filename =
      typeof json.filename === "string" && json.filename.trim() ? json.filename.trim() : path.basename(storagePath);
    const mimeType =
      typeof json.mimeType === "string" && ALLOWED.has(json.mimeType)
        ? json.mimeType
        : "image/jpeg";
    const altRaw = json.alt;
    const alt = typeof altRaw === "string" && altRaw.trim() ? altRaw.trim() : null;

    if (!storagePath || !isAllowedMediaStoragePath(storagePath)) {
      return NextResponse.json({ error: "Chemin invalide" }, { status: 400 });
    }

    if (!hasSupabaseMediaStorageEnv()) {
      return NextResponse.json({ error: "Configuration Storage absente" }, { status: 503 });
    }

    const admin = createSupabaseServiceRoleClient();
    const bucket = getMediaStorageBucket();
    if (!admin) {
      return NextResponse.json({ error: "Configuration Storage incomplète" }, { status: 500 });
    }

    const { data: pub } = admin.storage.from(bucket).getPublicUrl(storagePath);
    const url = pub.publicUrl;

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

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

/** Multipart : écriture locale (hors Vercel ou sans Supabase). */
async function handleMultipart(req: Request): Promise<NextResponse> {
  if (isOnVercel()) {
    return NextResponse.json(
      {
        error:
          "Téléversement direct indisponible sur Vercel. Utilisez Storage Supabase (variables d’environnement + bucket site-media).",
      },
      { status: 503 },
    );
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

  const { base, ext } = sanitizeFilename(file.name, mimeType);
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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return handleJson(req);
  }

  return handleMultipart(req);
}
