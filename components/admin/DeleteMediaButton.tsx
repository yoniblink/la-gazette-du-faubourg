"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteMedia } from "@/app/admin/(panel)/media/actions";

export function DeleteMediaButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    const res = await deleteMedia(id);
    setPending(false);
    setOpen(false);
    if (res.ok) {
      toast.success("Média supprimé.");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger asChild>
        <button type="button" className="text-xs text-red-600 hover:underline">
          Supprimer
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-black/40" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[min(calc(100vw-2rem),400px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-stone-200 bg-white p-6 shadow-lg">
          <AlertDialog.Title className="font-[family-name:var(--font-serif)] text-lg font-light text-stone-900">
            Supprimer ce média ?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-stone-600">
            Le fichier sera retiré du serveur et de la bibliothèque.
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button type="button" className="rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-100">
                Annuler
              </button>
            </AlertDialog.Cancel>
            <button
              type="button"
              disabled={pending}
              onClick={() => void handleConfirm()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "…" : "Supprimer"}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
