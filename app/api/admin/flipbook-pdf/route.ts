import { NextResponse } from "next/server";
import { after } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import {
  hasILovePdfCredentials,
  renderFlipbookPdfToStorageAndPersist,
} from "@/lib/flipbook-render-server";
import { prisma } from "@/lib/prisma";
import { HOME_FLIPBOOK_MANIFEST_KEY, HOME_FLIPBOOK_PDF_URL_KEY } from "@/lib/site-settings";
import { parseSupabaseStoragePublicUrl } from "@/lib/supabase-storage-public-url";
import {
  createSupabaseServiceRoleClient,
  getFlipbookStorageBucket,
  hasSupabaseFlipbookStorageEnv,
} from "@/lib/supabase-service";

/**
 * Génération flipbook : Chromium peut dépasser 60 s (cold start + N pages).
 * Vercel Hobby plafonne quand même à 60 s ; Pro → jusqu’à 300 s selon le projet.
 */
export const maxDuration = 300;

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

function isOnVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

/** Message utile quand le bucket Storage n’existe pas ou le nom ne correspond pas. */
function explainStorageError(message: string | undefined, bucket: string): string {
  const m = (message ?? "").toLowerCase();
  if (
    m.includes("does not exist") ||
    m.includes("not found") ||
    m.includes("resource") && m.includes("exist") ||
    m.includes("no such bucket") ||
    m.includes("bucket not found")
  ) {
    return (
      `Bucket Storage « ${bucket} » introuvable ou nom incorrect. ` +
      `Dans Supabase : Storage → New bucket → nom exact « ${bucket} », puis marquez-le public (pour afficher le PDF).`
    );
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
        if (isOnVercel()) {
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
            error: explainStorageError(error?.message, bucket),
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

      if (!hasILovePdfCredentials()) {
        return NextResponse.json(
          {
            error:
              "ILOVEPDF_PUBLIC_KEY et ILOVEPDF_SECRET_KEY requis pour générer le flipbook (developer.ilovepdf.com).",
          },
          { status: 503 },
        );
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

      await prisma.siteSetting.deleteMany({ where: { key: HOME_FLIPBOOK_MANIFEST_KEY } });

      after(async () => {
        const r = await renderFlipbookPdfToStorageAndPersist({
          publicPdfUrl: publicUrl,
          pdfStoragePath: storagePath,
          bucket,
        });
        if (!r.ok) console.error("[flipbook-pdf] after(commit) render:", r.error);
      });

      return NextResponse.json({ ok: true, url: publicUrl, renderingScheduled: true as const });
    }

    /** Relance la génération PNG (même PDF que l’URL enregistrée) — utile si le job initial a échoué / timeout. */
    if (action === "renderPages") {
      if (!hasSupabaseFlipbookStorageEnv()) {
        return NextResponse.json(
          { error: "SUPABASE_SERVICE_ROLE_KEY requis pour rasteriser le PDF." },
          { status: 503 },
        );
      }
      if (!hasILovePdfCredentials()) {
        return NextResponse.json(
          {
            error:
              "ILOVEPDF_PUBLIC_KEY et ILOVEPDF_SECRET_KEY requis (voir .env.example).",
          },
          { status: 503 },
        );
      }
      const row = await prisma.siteSetting.findUnique({
        where: { key: HOME_FLIPBOOK_PDF_URL_KEY },
      });
      const publicUrl = row?.value?.trim();
      if (!publicUrl?.startsWith("https://")) {
        return NextResponse.json(
          { error: "Aucun PDF Supabase enregistré (URL HTTPS attendue)." },
          { status: 400 },
        );
      }
      const parsed = parseSupabaseStoragePublicUrl(publicUrl);
      if (!parsed) {
        return NextResponse.json(
          { error: "URL du PDF non reconnue (format Supabase Storage public attendu)." },
          { status: 400 },
        );
      }
      if (!isAllowedFlipbookStoragePath(parsed.objectPath)) {
        return NextResponse.json({ error: "Chemin du PDF non autorisé pour le flipbook." }, { status: 400 });
      }

      await prisma.siteSetting.deleteMany({ where: { key: HOME_FLIPBOOK_MANIFEST_KEY } });

      const rendered = await renderFlipbookPdfToStorageAndPersist({
        publicPdfUrl: publicUrl,
        pdfStoragePath: parsed.objectPath,
        bucket: parsed.bucket,
      });
      if (!rendered.ok) {
        return NextResponse.json({ error: rendered.error }, { status: 500 });
      }
      return NextResponse.json({ ok: true as const });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  // Sur Vercel, ne jamais lire un corps multipart : limite ~4,5 Mo → 413 avant même ce code.
  if (isOnVercel()) {
    return NextResponse.json(
      {
        error:
          "Requête non prise en charge : rechargez la page Réglages (cache vidé) pour utiliser le téléversement via Supabase Storage, pas l’envoi direct du fichier au serveur.",
      },
      { status: 415 },
    );
  }

  if (!hasSupabaseFlipbookStorageEnv()) {
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

    await prisma.siteSetting.deleteMany({ where: { key: HOME_FLIPBOOK_MANIFEST_KEY } });

    return NextResponse.json({ ok: true, url });
  }

  return NextResponse.json(
    {
      error:
        "Multipart désactivé quand Supabase Storage est configuré en local : utilisez la même procédure JSON + Storage ou retirez SUPABASE_SERVICE_ROLE_KEY pour tester sur disque.",
    },
    { status: 400 },
  );
}

/** Évite les GET « fantômes » avec gros corps ; indique le bon flux (POST JSON uniquement). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return NextResponse.json({
    message:
      "POST JSON uniquement : prepare, commit, renderPages. Le PDF ne doit pas transiter sur cette route (sinon 413).",
  });
}
