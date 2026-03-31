import { FlipbookPdfAdmin } from "@/components/admin/FlipbookPdfAdmin";
import { getFlipbookCatalogWithActive } from "@/lib/flipbook-catalog";
import { getHomeFlipbookManifest, getHomeFlipbookPdfUrl } from "@/lib/site-settings";

export default async function AdminFlipbookPage() {
  const [flipbookPdfUrl, flipbookManifest, catalog] = await Promise.all([
    getHomeFlipbookPdfUrl(),
    getHomeFlipbookManifest(),
    getFlipbookCatalogWithActive(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl font-light text-stone-900">Flipbook</h1>
      <p className="mt-2 text-sm text-stone-500">
        Magazine feuilletable affiché sur la page d&apos;accueil, au-dessus de la section newsletter.
      </p>
      <FlipbookPdfAdmin
        catalog={catalog}
        currentPdfUrl={flipbookPdfUrl}
        hasManifest={Boolean(flipbookManifest?.pageUrls?.length)}
      />
    </div>
  );
}
