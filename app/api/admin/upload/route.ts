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

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
/** Vidéos courtes pour la médiathèque (envoi direct vers Supabase). */
const MAX_VIDEO_BYTES = 120 * 1024 * 1024;

const ALLOWED_IMAGES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_VIDEOS = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const ALLOWED = new Set<string>([...ALLOWED_IMAGES, ...ALLOWED_VIDEOS]);

/** Si le navigateur envoie `application/octet-stream` ou une chaîne vide, on déduit du nom de fichier. */
function resolveUploadMime(filename: string, contentType: string): string {
  const raw = (contentType || "").trim().toLowerCase();
  if (raw && raw !== "application/octet-stream") return contentType.trim();
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
  };
  return map[ext] ?? (raw || "application/octet-stream");
}

function maxBytesForMime(mime: string): number {
  return ALLOWED_VIDEOS.has(mime) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

function isOnVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

function sanitizeFilename(original: string, mimeType: string): { base: string; ext: string } {
  const safe = original.replace(/[^\w.\-]+/g, "_") || "file";
  let ext = path.extname(safe).toLowerCase();
  if (!ext) {
    if (mimeType === "image/png") ext = ".png";
    else if (mimeType === "image/webp") ext = ".webp";
    else if (mimeType === "image/gif") ext = ".gif";
    else if (mimeType === "video/webm") ext = ".webm";
    else if (mimeType === "video/quicktime") ext = ".mov";
    else if (mimeType === "video/mp4") ext = ".mp4";
    else ext = ".jpg";
  }
  const base = (path.basename(safe, path.extname(safe)) || "file").slice(0, 80);
  return { base, ext };
}

function isAllowedMediaStoragePath(storagePath: string): boolean {
  if (!storagePath.startsWith("admin-media/")) return false;
  const parts = storagePath.split("/").filter(Boolean);
  if (parts.length < 3) return false;
  if (parts[0] !== "admin-media") return false;
  if (!/^[a-f0-9]{16}$/.test(parts[1] ?? "")) return false;
  return /\.(jpe?g|png|webp|gif|mp4|webm|mov)$/i.test(parts[parts.length - 1] ?? "");
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
    const mime = resolveUploadMime(filename, contentType);
    const maxBytes = maxBytesForMime(mime);

    if (!filename || size <= 0) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }
    if (size > maxBytes) {
      const hint = ALLOWED_VIDEOS.has(mime) ? "max 120 Mo pour les vidéos" : "max 8 Mo pour les images";
      return NextResponse.json({ error: `Fichier trop volumineux (${hint})` }, { status: 400 });
    }
    if (!ALLOWED.has(mime)) {
      return NextResponse.json({ error: "Type non autorisé (images ou MP4, WebM, MOV)" }, { status: 400 });
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
    const rawMime = typeof json.mimeType === "string" ? json.mimeType : "";
    let mimeType = resolveUploadMime(filename, rawMime);
    if (!ALLOWED.has(mimeType)) {
      mimeType = resolveUploadMime(path.basename(storagePath), "");
    }
    if (!ALLOWED.has(mimeType)) {
      mimeType = "image/jpeg";
    }
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
  const mimeType = resolveUploadMime(file.name, file.type || "");
  const maxBytes = maxBytesForMime(mimeType);
  if (file.size > maxBytes) {
    const hint = ALLOWED_VIDEOS.has(mimeType) ? "max 120 Mo pour les vidéos" : "max 8 Mo pour les images";
    return NextResponse.json({ error: `Fichier trop volumineux (${hint})` }, { status: 400 });
  }
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
