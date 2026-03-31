import path from "path";
import { prisma } from "@/lib/prisma";
import { parseSupabaseStoragePublicUrl } from "@/lib/supabase-storage-public-url";
import {
  getHomeFlipbookPdfUrl,
  HOME_FLIPBOOK_CATALOG_KEY,
  HOME_FLIPBOOK_MANIFEST_KEY,
} from "@/lib/site-settings";

export type FlipbookCatalogEntry = {
  id: string;
  pdfUrl: string;
  storagePath: string | null;
  label: string;
  manifestJson: string | null;
  addedAt: string;
};

function isEntry(x: unknown): x is FlipbookCatalogEntry {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.pdfUrl === "string" &&
    (o.storagePath === null || typeof o.storagePath === "string") &&
    typeof o.label === "string" &&
    (o.manifestJson === null || typeof o.manifestJson === "string") &&
    typeof o.addedAt === "string"
  );
}

export function parseFlipbookCatalog(raw: string | null | undefined): FlipbookCatalogEntry[] {
  if (!raw?.trim()) return [];
  try {
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    return j.filter(isEntry);
  } catch {
    return [];
  }
}

export function serializeFlipbookCatalog(entries: FlipbookCatalogEntry[]): string {
  return JSON.stringify(entries);
}

function deriveLabel(storagePath: string | null, pdfUrl: string): string {
  if (storagePath) {
    const base = path.posix.basename(storagePath);
    return base.replace(/\.pdf$/i, "").replace(/-[a-f0-9]{16}(?=\.pdf$)/i, "") || base;
  }
  try {
    const u = new URL(pdfUrl, "http://localhost");
    const seg = u.pathname.split("/").filter(Boolean);
    const last = seg[seg.length - 1] ?? "magazine";
    return decodeURIComponent(last).replace(/\.pdf$/i, "") || "Magazine";
  } catch {
    return "Magazine";
  }
}

export function createCatalogEntryFromSupabase(storagePath: string, publicUrl: string): FlipbookCatalogEntry {
  const parts = storagePath.split("/").filter(Boolean);
  const id = parts.length >= 2 ? parts[1]! : publicUrl;
  return {
    id,
    pdfUrl: publicUrl,
    storagePath,
    label: deriveLabel(storagePath, publicUrl),
    manifestJson: null,
    addedAt: new Date().toISOString(),
  };
}

export function createCatalogEntryLocal(relativeUrl: string, filename: string): FlipbookCatalogEntry {
  return {
    id: `local:${filename}`,
    pdfUrl: relativeUrl,
    storagePath: null,
    label: deriveLabel(null, relativeUrl),
    manifestJson: null,
    addedAt: new Date().toISOString(),
  };
}

export function mergeNewUpload(
  catalog: FlipbookCatalogEntry[],
  entry: FlipbookCatalogEntry,
): FlipbookCatalogEntry[] {
  const rest = catalog.filter((e) => e.pdfUrl !== entry.pdfUrl && e.id !== entry.id);
  return [entry, ...rest];
}

export async function saveFlipbookCatalog(entries: FlipbookCatalogEntry[]): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: HOME_FLIPBOOK_CATALOG_KEY },
    create: { key: HOME_FLIPBOOK_CATALOG_KEY, value: serializeFlipbookCatalog(entries) },
    update: { value: serializeFlipbookCatalog(entries) },
  });
}

export async function getFlipbookCatalog(): Promise<FlipbookCatalogEntry[]> {
  const row = await prisma.siteSetting.findUnique({
    where: { key: HOME_FLIPBOOK_CATALOG_KEY },
  });

  if (row?.value != null) {
    return parseFlipbookCatalog(row.value);
  }

  const pdfUrl = await getHomeFlipbookPdfUrl();
  if (!pdfUrl) {
    await prisma.siteSetting.upsert({
      where: { key: HOME_FLIPBOOK_CATALOG_KEY },
      create: { key: HOME_FLIPBOOK_CATALOG_KEY, value: "[]" },
      update: { value: "[]" },
    });
    return [];
  }

  const manifestRow = await prisma.siteSetting.findUnique({
    where: { key: HOME_FLIPBOOK_MANIFEST_KEY },
  });
  const parsed = parseSupabaseStoragePublicUrl(pdfUrl);
  const pathParts = parsed?.objectPath.split("/").filter(Boolean) ?? [];
  const id = pathParts.length >= 2 ? pathParts[1]! : `legacy:${encodeURIComponent(pdfUrl.slice(0, 120))}`;

  const entry: FlipbookCatalogEntry = {
    id,
    pdfUrl,
    storagePath: parsed?.objectPath ?? null,
    label: deriveLabel(parsed?.objectPath ?? null, pdfUrl),
    manifestJson: manifestRow?.value?.trim() || null,
    addedAt: new Date().toISOString(),
  };

  await saveFlipbookCatalog([entry]);
  return [entry];
}

export async function updateFlipbookCatalogManifest(
  pdfStoragePath: string,
  manifestJson: string,
): Promise<void> {
  const catalog = await getFlipbookCatalog();
  const idx = catalog.findIndex((e) => e.storagePath === pdfStoragePath);
  if (idx < 0) return;
  const next = [...catalog];
  const prev = next[idx]!;
  next[idx] = { ...prev, manifestJson };
  await saveFlipbookCatalog(next);
}

/** Pour l’admin : garantit que le PDF actuellement affiché sur l’accueil figure dans le catalogue. */
export async function getFlipbookCatalogWithActive(): Promise<FlipbookCatalogEntry[]> {
  const catalog = await getFlipbookCatalog();
  const active = await getHomeFlipbookPdfUrl();
  if (!active) return catalog;
  if (catalog.some((e) => e.pdfUrl === active)) return catalog;

  const manifestRow = await prisma.siteSetting.findUnique({
    where: { key: HOME_FLIPBOOK_MANIFEST_KEY },
  });
  const parsed = parseSupabaseStoragePublicUrl(active);
  const pathParts = parsed?.objectPath.split("/").filter(Boolean) ?? [];
  const id =
    pathParts.length >= 2 ? pathParts[1]! : `sync:${encodeURIComponent(active.slice(0, 96))}`;
  const entry: FlipbookCatalogEntry = {
    id,
    pdfUrl: active,
    storagePath: parsed?.objectPath ?? null,
    label: deriveLabel(parsed?.objectPath ?? null, active),
    manifestJson: manifestRow?.value?.trim() || null,
    addedAt: new Date().toISOString(),
  };
  const merged = mergeNewUpload(catalog, entry);
  await saveFlipbookCatalog(merged);
  return merged;
}
