import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HOME_FLIPBOOK_PDF_URL_KEY } from "@/lib/site-settings";
import {
  createSupabaseServiceRoleClient,
  getFlipbookStorageBucket,
  hasSupabaseFlipbookStorageEnv,
} from "@/lib/supabase-service";

const MAX_BYTES = 40 * 1024 * 1024;

function isPdfFile(file: File): boolean {
  const mime = file.type || "";
  if (mime === "application/pdf" || mime === "application/x-pdf") return true;
  if (mime === "" || mime === "application/octet-stream") {
    return file.name.toLowerCase().endsWith(".pdf");
  }
  return false;
}

function isPdfFilename(name: string): boolean {
  return name.trim().toLowerCase().endsWith(".pdf");
}

function sanitizeUploadBase(name: string): string {
  const original = name.replace(/[^\w.\-]+/g, "_") || "document";
  const base =
    path.basename(original, path.extname(original)).slice(0, 80) || "gazette";
  return base;
}

function isAllowedFlipbookStoragePath(storagePath: string): boolean {
  if (!storagePath.startsWith("flipbook/")) return false;
  const parts = storagePath.split("/").filter(Boolean);
  if (parts.length < 3) return false;
  if (parts[0] !== "flipbook") return false;
  if (!/^[a-f0-9]{16}$/.test(parts[1] ?? "")) return false;
  return /\.pdf$/i.test(parts[parts.length - 1] ?? "");
}

type PrepareBody = { action?: string; filename?: string; size?: number };
type CommitBody = { action?: string; path?: string };

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
      if (!filename || size <= 0) {
        return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
      }
      if (size > MAX_BYTES) {
        return NextResponse.json(
          { error: "Fichier trop volumineux (max 40 Mo)" },
          { status: 400 },
        );
      }
      if (!isPdfFilename(filename)) {
        return NextResponse.json({ error: "Un fichier PDF est requis" }, { status: 400 });
      }

      if (!hasSupabaseFlipbookStorageEnv()) {
        if (process.env.VERCEL === "1") {
          return NextResponse.json(
            {
              error:
                "Téléversement PDF sur Vercel : ajoutez SUPABASE_SERVICE_ROLE_KEY, créez un bucket Storage public (ex. flipbook-pdf), et FLIPBOOK_STORAGE_BUCKET si besoin. Voir .env.example.",
            },
            { status: 503 },
          );
        }
        return NextResponse.json({ mode: "local" as const });
      }

      const admin = createSupabaseServiceRoleClient();
      const bucket = getFlipbookStorageBucket();
      if (!admin) {
        return NextResponse.json({ error: "Configuration Storage incomplète" }, { status: 500 });
      }

      const folder = randomBytes(8).toString("hex");
      const base = sanitizeUploadBase(filename);
      const unique = randomBytes(8).toString("hex");
      const storagePath = `flipbook/${folder}/${base}-${unique}.pdf`;

      const { data, error } = await admin.storage
        .from(bucket)
        .createSignedUploadUrl(storagePath, { upsert: true });

      if (error || !data) {
        console.error("[flipbook-pdf] createSignedUploadUrl", error?.message);
        return NextResponse.json(
          {
            error:
              error?.message ??
              "Impossible de préparer l’upload Storage (bucket créé et public ?)",
          },
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
      if (!storagePath || !isAllowedFlipbookStoragePath(storagePath)) {
        return NextResponse.json({ error: "Chemin invalide" }, { status: 400 });
      }

      const admin = createSupabaseServiceRoleClient();
      const bucket = getFlipbookStorageBucket();
      if (!admin) {
        return NextResponse.json({ error: "Configuration Storage incomplète" }, { status: 500 });
      }

      const { data: pub } = admin.storage.from(bucket).getPublicUrl(storagePath);
      const publicUrl = pub.publicUrl;
      if (!publicUrl) {
        return NextResponse.json({ error: "URL publique introuvable" }, { status: 500 });
      }

      await prisma.siteSetting.upsert({
        where: { key: HOME_FLIPBOOK_PDF_URL_KEY },
        create: { key: HOME_FLIPBOOK_PDF_URL_KEY, value: publicUrl },
        update: { value: publicUrl },
      });

      return NextResponse.json({ ok: true, url: publicUrl });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  if (!hasSupabaseFlipbookStorageEnv() || process.env.VERCEL !== "1") {
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

  return NextResponse.json(
    {
      error:
        "Sur Vercel, le PDF ne transite pas par ce serveur. Rechargez la page : le téléversement utilise Supabase Storage.",
    },
    { status: 400 },
  );
}
