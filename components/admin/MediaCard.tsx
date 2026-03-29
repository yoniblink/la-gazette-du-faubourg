"use client";

import Image from "next/image";
import { toast } from "sonner";
import { DeleteMediaButton } from "@/components/admin/DeleteMediaButton";

export type MediaCardItem = {
  id: string;
  url: string;
  filename: string;
  alt: string | null;
};

export function MediaCard({ item }: { item: MediaCardItem }) {
  function copyUrl() {
    const full =
      typeof window !== "undefined" ? `${window.location.origin}${item.url}` : item.url;
    void navigator.clipboard.writeText(full);
    toast.success("URL copiée.");
  }

  return (
    <li className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="relative aspect-square bg-stone-100">
        <Image
          src={item.url}
          alt={item.alt ?? item.filename}
          fill
          className="object-cover"
          sizes="(max-width:768px) 50vw, 200px"
        />
      </div>
      <div className="space-y-2 p-3">
        <p className="truncate font-mono text-[10px] text-stone-500" title={item.url}>
          {item.url}
        </p>
        <button
          type="button"
          onClick={copyUrl}
          className="w-full rounded border border-stone-200 py-1.5 text-[10px] uppercase tracking-wider text-stone-600 hover:bg-stone-50"
        >
          Copier l’URL
        </button>
        <DeleteMediaButton id={item.id} />
      </div>
    </li>
  );
}
