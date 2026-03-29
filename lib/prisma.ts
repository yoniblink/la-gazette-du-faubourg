import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const log =
  process.env.NODE_ENV === "development" ? (["error", "warn"] as const) : (["error"] as const);

function getOrCreateClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({ log: [...log] });
  }
  return globalForPrisma.prisma;
}

/** True when PostgreSQL URL is configured (site + admin can use Prisma). */
export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * Prisma client only when DATABASE_URL is set. Use for public routes that can fall back to static content.
 */
export function tryPrisma(): PrismaClient | null {
  if (!hasDatabaseUrl()) return null;
  return getOrCreateClient();
}

const missingUrlMessage =
  "DATABASE_URL manquant. Copiez .env.example vers .env (DATABASE_URL + DIRECT_URL pour Supabase), puis : npx prisma migrate deploy && npm run db:seed";

/**
 * Prisma client; throws if DATABASE_URL is missing. Use for admin, auth, uploads.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!hasDatabaseUrl()) {
      throw new Error(missingUrlMessage);
    }
    return Reflect.get(getOrCreateClient(), prop, receiver);
  },
});
