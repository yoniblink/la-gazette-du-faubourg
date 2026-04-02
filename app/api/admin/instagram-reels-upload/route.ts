import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import path from "path";
import { auth } from "@/auth";
import {
  createSupabaseServiceRoleClient,
  getInstagramReelsStorageBucket,
  hasInstagramReelsStorageEnv,
} from "@/lib/supabase-service";
import {
  isAllowedInstagramReelPosterPath,
  isAllowedInstagramReelVideoPath,
  nextInstagramReelFolder,
} from "@/lib/instagram-reels-storage";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_POSTER_BYTES = 8 * 1024 * 1024;

function isOnVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

function explainStorageError(message: string | undefined, bucket: string): string {
  const m = (message ?? "").toLowerCase();
  if (
    m.includes("does not exist") ||
    m.includes("not found") ||
    (m.includes("resource") && m.includes("exist")) ||
    m.includes("no such bucket") ||
    m.includes("bucket not found")
  ) {
    return (
      `Bucket Storage « ${bucket} » introuvable. Créez un bucket public ` +
      `« ${bucket} » (voir supabase/storage-instagram-reels-setup.sql).`
    );
  }
  return message ?? "Erreur Storage Supabase.";
}

function isVideoFilename(name: string): boolean {
  const ext = path.extname(name).toLowerCase();
  return [".mp4", ".webm", ".mov", ".m4v"].includes(ext);
}

function isPosterFilename(name: string): boolean {
  const ext = path.extname(name).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

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
    const kind = json.kind === "poster" ? "poster" : "video";

    if (!filename || size <= 0) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    if (kind === "video") {
      if (size > MAX_VIDEO_BYTES) {
        return NextResponse.json({ error: "Vidéo trop volumineuse (max 100 Mo)" }, { status: 400 });
      }
      if (!isVideoFilename(filename)) {
        return NextResponse.json({ error: "Format vidéo : MP4, WebM ou MOV" }, { status: 400 });
      }
    } else {
      if (size > MAX_POSTER_BYTES) {
        return NextResponse.json({ error: "Image trop volumineuse (max 8 Mo)" }, { status: 400 });
      }
      if (!isPosterFilename(filename)) {
        return NextResponse.json({ error: "Image : JPG, PNG ou WebP" }, { status: 400 });
      }
    }

    if (!hasInstagramReelsStorageEnv()) {
      if (isOnVercel()) {
        return NextResponse.json(
          {
            error:
              "Téléversement sur Vercel : configurez SUPABASE_SERVICE_ROLE_KEY et le bucket instagram-reels (voir .env.example).",
          },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: "Configuration Supabase Storage incomplète" }, { status: 503 });
    }

    const admin = createSupabaseServiceRoleClient();
    const bucket = getInstagramReelsStorageBucket();
    if (!admin) {
      return NextResponse.json({ error: "Client Storage indisponible" }, { status: 500 });
    }

    const folder = nextInstagramReelFolder();
    const unique = randomBytes(6).toString("hex");
    const ext = path.extname(filename).toLowerCase() || (kind === "video" ? ".mp4" : ".jpg");
    const sub =
      kind === "video" ? `video-${unique}${ext}` : `poster-${unique}${ext}`;
    const storagePath = `reels/${folder}/${sub}`;

    const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(storagePath, {
      upsert: true,
    });

    if (error || !data) {
      console.error("[instagram-reels-upload] createSignedUploadUrl", error?.message);
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
    const videoPath = typeof json.videoPath === "string" ? json.videoPath : "";
    const posterPathRaw = json.posterPath;
    const posterPath =
      typeof posterPathRaw === "string" && posterPathRaw.trim() ? posterPathRaw.trim() : null;
    const captionRaw = json.caption;
    const caption =
      typeof captionRaw === "string" && captionRaw.trim() ? captionRaw.trim().slice(0, 280) : null;

    if (!videoPath || !isAllowedInstagramReelVideoPath(videoPath)) {
      return NextResponse.json({ error: "Chemin vidéo invalide" }, { status: 400 });
    }
    if (posterPath && !isAllowedInstagramReelPosterPath(posterPath)) {
      return NextResponse.json({ error: "Chemin image d’aperçu invalide" }, { status: 400 });
    }

    if (!hasInstagramReelsStorageEnv()) {
      return NextResponse.json({ error: "Configuration Supabase Storage incomplète" }, { status: 503 });
    }

    const admin = createSupabaseServiceRoleClient();
    const bucket = getInstagramReelsStorageBucket();
    if (!admin) {
      return NextResponse.json({ error: "Client Storage indisponible" }, { status: 500 });
    }

    const { data: pubVideo } = admin.storage.from(bucket).getPublicUrl(videoPath);
    if (!pubVideo.publicUrl) {
      return NextResponse.json({ error: "URL vidéo publique introuvable" }, { status: 500 });
    }

    let posterUrl: string | null = null;
    if (posterPath) {
      const { data: pubPoster } = admin.storage.from(bucket).getPublicUrl(posterPath);
      posterUrl = pubPoster.publicUrl || null;
      if (!posterUrl) {
        return NextResponse.json({ error: "URL image d’aperçu introuvable" }, { status: 500 });
      }
    }

    const last = await prisma.instagramReel.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = (last?.sortOrder ?? -1) + 1;

    await prisma.instagramReel.create({
      data: {
        videoUrl: pubVideo.publicUrl,
        posterUrl,
        caption,
        sortOrder,
      },
    });

    return NextResponse.json({ ok: true as const });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return NextResponse.json({
    message: "POST JSON : prepare (filename, size, kind), commit (videoPath, posterPath?, caption?).",
  });
}
