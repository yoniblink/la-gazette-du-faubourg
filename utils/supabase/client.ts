import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/utils/supabase/env";

export const createClient = () =>
  createBrowserClient(getSupabaseUrl()!, getSupabaseAnonKey()!);
