import { prisma } from "@/lib/prisma";
import { MediaDropzone } from "@/components/admin/MediaDropzone";
import { MediaCard } from "@/components/admin/MediaCard";

export default async function AdminMediaPage() {
  const items = await prisma.media.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl font-light tracking-tight text-stone-900">
        Médiathèque
      </h1>
      <p className="mt-2 text-sm text-stone-500">
        Téléversez et réutilisez des images et des vidéos sur le site
      </p>

      <div className="mt-10">
        <MediaDropzone />
      </div>

      <h2 className="mt-14 text-sm font-medium uppercase tracking-wider text-stone-500">Fichiers</h2>
      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.length === 0 ? (
          <li className="col-span-full py-12 text-center text-sm text-stone-500">Aucun média pour le moment.</li>
        ) : (
          items.map((m) => (
            <MediaCard
              key={m.id}
              item={{
                id: m.id,
                url: m.url,
                filename: m.filename,
                alt: m.alt,
                mimeType: m.mimeType,
              }}
            />
          ))
        )}
      </ul>
    </div>
  );
}
