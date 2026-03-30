/**
 * Parse une URL publique Supabase Storage
 * ( …/storage/v1/object/public/<bucket>/<path> )
 */
export function parseSupabaseStoragePublicUrl(
  url: string,
): { bucket: string; objectPath: string } | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!m) return null;
    return {
      bucket: m[1],
      objectPath: decodeURIComponent(m[2]),
    };
  } catch {
    return null;
  }
}
