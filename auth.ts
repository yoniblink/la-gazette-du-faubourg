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
 * Auth.js exige un secret pour signer les JWT. Sans AUTH_SECRET, la connexion échoue avec
 * "There was a problem with the server configuration".
 *
 * Pendant `next build` (collecte des données), Next définit NEXT_PHASE=phase-production-build
 * alors que les variables Vercel peuvent ne pas être résolues comme en runtime — on utilise un
 * secret factice uniquement pour finir la compilation. En prod runtime, AUTH_SECRET (ou NEXTAUTH_SECRET) est obligatoire.
 */
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
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "build-only-placeholder-secret-do-not-use!!";
  }
  throw new Error(
    "AUTH_SECRET est requis en production (min. 16 caractères). Ex. : openssl rand -base64 32 — sur Vercel : Environment Variables → AUTH_SECRET",
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
