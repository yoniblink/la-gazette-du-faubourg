/**
 * Secret JWT partagé par Auth.js (auth.ts) et le proxy Next.js (`proxy.ts`).
 * Reste léger (pas de Prisma / bcrypt) pour respecter la limite ~1 Mo des Edge Functions Vercel.
 */
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

export function authSecret(): string {
  const fromEnv =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 16) {
    return fromEnv;
  }
  if (process.env.NODE_ENV === "development") {
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
