/**
 * Public Supabase URL + anon JWT (dashboard : Project Settings → API → anon public).
 * Accepte aussi NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY pour rester aligné avec l’historique du dépôt.
 */
export function getSupabaseUrl(): string | undefined {
  const u =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  return u || undefined;
}

export function getSupabaseAnonKey(): string | undefined {
  const k =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();
  return k || undefined;
}
