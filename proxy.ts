import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { authSecret } from "@/lib/auth-secret";
import { updateSession } from "@/utils/supabase/middleware";

/**
 * Vérification session légère (JWT uniquement) — n'importe pas @/auth pour éviter Prisma/bcrypt
 * dans le bundle Edge (~1 Mo max sur Vercel Hobby).
 */
export async function proxy(req: NextRequest) {
  const supabaseResponse = await updateSession(req);
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/admin")) return supabaseResponse;
  if (pathname === "/admin/login") return supabaseResponse;

  const token = await getToken({
    req,
    secret: authSecret(),
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!token) {
    const url = new URL("/admin/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies
      .getAll()
      .forEach(({ name, value }) => redirectResponse.cookies.set(name, value));
    return redirectResponse;
  }
  return supabaseResponse;
}

export const config = {
  // Skip API routes so request bodies (e.g. multipart uploads) are not passed through updateSession / NextResponse chain.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
