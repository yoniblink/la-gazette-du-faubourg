import Link from "next/link";
import { FlipbookPdfAdmin } from "@/components/admin/FlipbookPdfAdmin";
import { FLIPBOOK_DEFAULT_MAX_PAGES } from "@/lib/flipbook-config";
import { getHomeFlipbookManifest, getHomeFlipbookPdfUrl } from "@/lib/site-settings";

export default async function AdminSettingsPage() {
  const flipbookPdfUrl = await getHomeFlipbookPdfUrl();
  const flipbookManifest = await getHomeFlipbookManifest();
  const envMax = process.env.FLIPBOOK_RENDER_MAX_PAGES?.trim();
  const parsed = envMax ? parseInt(envMax, 10) : NaN;
  const maxPagesInFlipbook = Number.isFinite(parsed) ? parsed : FLIPBOOK_DEFAULT_MAX_PAGES;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl font-light text-stone-900">Réglages</h1>
      <p className="mt-2 text-sm text-stone-500">
        Paramètres globaux du site pourront être ajoutés ici (métadonnées, intégrations).
      </p>
      <FlipbookPdfAdmin
        currentPdfUrl={flipbookPdfUrl}
        hasManifest={Boolean(flipbookManifest?.pageUrls?.length)}
        maxPagesInFlipbook={maxPagesInFlipbook}
      />
      <div className="mt-10 rounded-xl border border-stone-200 bg-white p-8 text-sm text-stone-600">
        <p>
          Variables d’environnement : voir <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">.env.example</code> à la racine du projet (
          <code className="font-mono text-xs">DATABASE_URL</code>, <code className="font-mono text-xs">AUTH_SECRET</code>,{" "}
          <code className="font-mono text-xs">ADMIN_EMAIL</code> / <code className="font-mono text-xs">ADMIN_PASSWORD</code> pour le seed).
        </p>
        <p className="mt-4">
          Compte administrateur initial créé par{" "}
          <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs">npm run db:seed</code>.
        </p>
        <Link href="/admin/categories" className="mt-6 inline-block text-sm font-medium text-stone-800 underline">
          Gérer les rubriques
        </Link>
      </div>
    </div>
  );
}
