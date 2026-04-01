import { MediaKitPdfAdmin } from "@/components/admin/MediaKitPdfAdmin";
import { getMediaKitPdfUrl } from "@/lib/site-settings";

export default async function AdminMediaKitPage() {
  const currentUrl = await getMediaKitPdfUrl();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl font-light text-stone-900">Mediakit</h1>
      <p className="mt-2 text-sm text-stone-500">
        Téléverse ici le PDF du mediakit. La page publique /le-media-kit utilisera automatiquement ce fichier.
      </p>
      <MediaKitPdfAdmin currentUrl={currentUrl} />
    </div>
  );
}
