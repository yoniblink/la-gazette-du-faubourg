import { NextResponse } from "next/server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import {
  hasILovePdfCredentials,
  renderFlipbookPdfToStorageAndPersist,
} from "@/lib/flipbook-render-server";
import { prisma } from "@/lib/prisma";
import {
  createCatalogEntryFromSupabase,
  createCatalogEntryLocal,
  getFlipbookCatalog,
  mergeNewUpload,
  saveFlipbookCatalog,
} from "@/lib/flipbook-catalog";
import { HOME_FLIPBOOK_MANIFEST_KEY, HOME_FLIPBOOK_PDF_URL_KEY } from "@/lib/site-settings";
import { parseSupabaseStoragePublicUrl } from "@/lib/supabase-storage-public-url";
import {
  createSupabaseServiceRoleClient,
  getFlipbookStorageBucket,
  hasSupabaseFlipbookStorageEnv,
} from "@/lib/supabase-service";

/**
 * Génération flipbook (iLovePDF + Sharp → WebP) : peut dépasser 60 s sur de gros PDF.
 * Vercel Hobby plafonne à 60 s ; Pro → jusqu’à 300 s selon le projet.
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

async function listAllStorageObjects(
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) return [];
  const names: string[] = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error || !data || data.length === 0) break;
    for (const file of data) {
      if (!file.name) continue;
      const full = `${prefix}/${file.name}`.replace(/\/+/g, "/");
      names.push(full);
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return names;
}

async function deleteSupabaseFlipbookEntry(storagePath: string): Promise<string | null> {
  if (!isAllowedFlipbookStoragePath(storagePath)) {
    return "Chemin du PDF non autorisé pour la suppression.";
  }
  const admin = createSupabaseServiceRoleClient();
  if (!admin) return "Configuration Storage incomplète";
  const bucket = getFlipbookStorageBucket();
  const dir = path.posix.dirname(storagePath);
  const slotsPrefix = `${dir}/slots`;
  const slotFiles = await listAllStorageObjects(bucket, slotsPrefix);
  const toDelete = [storagePath, ...slotFiles];
  const unique = Array.from(new Set(toDelete));
  const { error } = await admin.storage.from(bucket).remove(unique);
  if (error) return error.message;
  return null;
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

      const catalogEntry = createCatalogEntryFromSupabase(storagePath, publicUrl);
      const catalogBefore = await getFlipbookCatalog();
      await saveFlipbookCatalog(mergeNewUpload(catalogBefore, catalogEntry));

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

    if (action === "setActive") {
      const pdfUrl = typeof json.pdfUrl === "string" ? json.pdfUrl.trim() : "";
      if (!pdfUrl) {
        return NextResponse.json({ error: "URL du PDF requise" }, { status: 400 });
      }
      const catalog = await getFlipbookCatalog();
      const entry = catalog.find((e) => e.pdfUrl === pdfUrl);
      if (!entry) {
        return NextResponse.json({ error: "Ce PDF ne figure pas dans le catalogue." }, { status: 400 });
      }

      await prisma.siteSetting.upsert({
        where: { key: HOME_FLIPBOOK_PDF_URL_KEY },
        create: { key: HOME_FLIPBOOK_PDF_URL_KEY, value: entry.pdfUrl },
        update: { value: entry.pdfUrl },
      });

      if (entry.manifestJson?.trim()) {
        await prisma.siteSetting.upsert({
          where: { key: HOME_FLIPBOOK_MANIFEST_KEY },
          create: { key: HOME_FLIPBOOK_MANIFEST_KEY, value: entry.manifestJson.trim() },
          update: { value: entry.manifestJson.trim() },
        });
      } else {
        await prisma.siteSetting.deleteMany({ where: { key: HOME_FLIPBOOK_MANIFEST_KEY } });
      }

      try {
        revalidatePath("/");
      } catch {
        /* */
      }

      return NextResponse.json({ ok: true as const });
    }

    if (action === "delete") {
      const pdfUrl = typeof json.pdfUrl === "string" ? json.pdfUrl.trim() : "";
      if (!pdfUrl) {
        return NextResponse.json({ error: "URL du PDF requise" }, { status: 400 });
      }
      const catalog = await getFlipbookCatalog();
      const idx = catalog.findIndex((e) => e.pdfUrl === pdfUrl);
      if (idx < 0) {
        return NextResponse.json({ error: "Ce PDF ne figure pas dans le catalogue." }, { status: 400 });
      }
      const entry = catalog[idx]!;

      if (entry.storagePath) {
        const err = await deleteSupabaseFlipbookEntry(entry.storagePath);
        if (err) {
          return NextResponse.json(
            { error: `Suppression Storage impossible: ${err}` },
            { status: 500 },
          );
        }
      } else if (entry.pdfUrl.startsWith("/uploads/")) {
        const localPath = path.join(process.cwd(), "public", entry.pdfUrl.replace(/^\/+/, ""));
        try {
          await unlink(localPath);
        } catch {
          /* ignore absence fichier */
        }
      }

      const nextCatalog = catalog.filter((e) => e.pdfUrl !== entry.pdfUrl);
      await saveFlipbookCatalog(nextCatalog);

      const wasActive = entry.pdfUrl === (await prisma.siteSetting.findUnique({
        where: { key: HOME_FLIPBOOK_PDF_URL_KEY },
      }))?.value?.trim();

      if (wasActive) {
        const next = nextCatalog[0] ?? null;
        if (next) {
          await prisma.siteSetting.upsert({
            where: { key: HOME_FLIPBOOK_PDF_URL_KEY },
            create: { key: HOME_FLIPBOOK_PDF_URL_KEY, value: next.pdfUrl },
            update: { value: next.pdfUrl },
          });
          if (next.manifestJson?.trim()) {
            await prisma.siteSetting.upsert({
              where: { key: HOME_FLIPBOOK_MANIFEST_KEY },
              create: { key: HOME_FLIPBOOK_MANIFEST_KEY, value: next.manifestJson.trim() },
              update: { value: next.manifestJson.trim() },
            });
          } else {
            await prisma.siteSetting.deleteMany({ where: { key: HOME_FLIPBOOK_MANIFEST_KEY } });
          }
        } else {
          await prisma.siteSetting.deleteMany({
            where: { key: HOME_FLIPBOOK_PDF_URL_KEY },
          });
          await prisma.siteSetting.deleteMany({ where: { key: HOME_FLIPBOOK_MANIFEST_KEY } });
        }
      }

      try {
        revalidatePath("/");
      } catch {
        /* */
      }

      return NextResponse.json({ ok: true as const });
    }

    /** Relance la génération WebP (même PDF que l’URL enregistrée) — utile si le job initial a échoué / timeout. */
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

    const localEntry = createCatalogEntryLocal(url, filename);
    const catBefore = await getFlipbookCatalog();
    await saveFlipbookCatalog(mergeNewUpload(catBefore, localEntry));

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
      "POST JSON uniquement : prepare, commit, setActive, delete, renderPages. Le PDF ne doit pas transiter sur cette route (sinon 413).",
  });
}
