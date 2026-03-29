import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { authSecret } from "@/lib/auth-secret";

/**
 * Vérification session légère (JWT uniquement) — n’importe pas @/auth pour éviter Prisma/bcrypt
 * dans le bundle Edge (~1 Mo max sur Vercel Hobby).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname === "/admin/login") return NextResponse.next();

  const token = await getToken({
    req,
    secret: authSecret(),
    secureCookie: process.env.NODE_ENV === "production",
  });

  if (!token) {
    const url = new URL("/admin/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
