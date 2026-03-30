import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/utils/supabase/env";

/**
 * Refreshes Supabase auth cookies when URL + anon key are configured.
 * If env is missing (common on Vercel when only Prisma is used), skip — otherwise Edge crashes with MIDDLEWARE_INVOCATION_FAILED.
 */
export const updateSession = async (request: NextRequest) => {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  // Forward the full NextRequest so the body stream is preserved (headers-only breaks multipart / FormData on API routes).
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();
  return supabaseResponse;
};
