import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/utils/supabase/env";

export { getInstagramReelsStorageBucket } from "@/lib/instagram-reels-storage";

/** Client serveur avec droits Storage complets (ne jamais exposer au navigateur). */
export function createSupabaseServiceRoleClient() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function hasSupabaseFlipbookStorageEnv(): boolean {
  return Boolean(getSupabaseUrl()?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function getFlipbookStorageBucket(): string {
  const b = (process.env.FLIPBOOK_STORAGE_BUCKET ?? "flipbook-pdf").trim();
  return b || "flipbook-pdf";
}

/** Médias admin (images articles) : bucket public, upload signé côté client (compatible Vercel). */
export function getMediaStorageBucket(): string {
  const b = (process.env.MEDIA_STORAGE_BUCKET ?? "site-media").trim();
  return b || "site-media";
}

export function hasSupabaseMediaStorageEnv(): boolean {
  return Boolean(getSupabaseUrl()?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/** Media kit (PDF annonceurs) : bucket public dédié. */
export function getMediaKitStorageBucket(): string {
  const b = (process.env.MEDIA_KIT_STORAGE_BUCKET ?? "media-kit").trim();
  return b || "media-kit";
}

export function hasSupabaseMediaKitStorageEnv(): boolean {
  return Boolean(getSupabaseUrl()?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/** Même prérequis que le flipbook : URL projet + service role pour Storage. */
export function hasInstagramReelsStorageEnv(): boolean {
  return Boolean(getSupabaseUrl()?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}
