import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Secret JWT Auth.js. Ordre de priorité :
 * 1. AUTH_SECRET ou NEXTAUTH_SECRET (recommandé en prod pour pouvoir le faire tourner sans dépendre de Vercel)
 * 2. Sur Vercel (VERCEL=1) sans variable : dérivé de VERCEL_PROJECT_ID (stable par projet, pas besoin d’entrée manuelle dans le dashboard)
 * 3. Développement local : secret de dev
 * 4. Build Next hors Vercel sans env : placeholder pour finir `next build`
 */
/** Dérivé stable par projet (VERCEL_PROJECT_ID). Sans node:crypto pour rester compatible Edge (middleware). */
function vercelDerivedAuthSecret(): string | null {
  if (process.env.VERCEL !== "1") return null;
  const basis =
    process.env.VERCEL_PROJECT_ID?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "";
  if (!basis) return null;
  const input = `la-gazette-du-faubourg|auth|v1|${basis}`;
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  const parts: string[] = [];
  let state = h >>> 0;
  for (let j = 0; j < 10; j++) {
    state = (Math.imul(state, 1664525) + 1013904223 + j) >>> 0;
    parts.push(state.toString(36));
  }
  const out = parts.join("");
  return out.length >= 32 ? out.slice(0, 64) : out.padEnd(64, "0");
}

function authSecret(): string {
  const fromEnv =
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 16) {
    return fromEnv;
  }
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[auth] AUTH_SECRET absent ou trop court — secret de développement utilisé. Ajoutez AUTH_SECRET dans .env (voir .env.example).",
    );
    return "dev-only-insecure-auth-secret-min-32-chars!!";
  }
  const vercelSecret = vercelDerivedAuthSecret();
  if (vercelSecret && vercelSecret.length >= 16) {
    return vercelSecret;
  }
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "build-only-placeholder-secret-do-not-use!!";
  }
  throw new Error(
    "AUTH_SECRET est requis en production (min. 16 caractères). Ex. : openssl rand -base64 32",
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret(),
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const email = parsed.data.email.trim().toLowerCase();
        const password = parsed.data.password.trim();
        if (!password) return null;
        const user = await prisma.adminUser.findUnique({ where: { email } });
        if (!user) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
