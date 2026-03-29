"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { getTiptapExtensions } from "@/lib/tiptap/extensions";
import { TipTapMenuBar } from "@/components/admin/TipTapMenuBar";

export function TipTapEditor({
  initial,
  onChange,
}: {
  initial: JSONContent | Record<string, unknown>;
  onChange?: (json: JSONContent) => void;
}) {
  const editor = useEditor({
    extensions: getTiptapExtensions("Écrivez le corps de l’article…"),
    content: initial,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[320px] px-4 py-4 outline-none font-[family-name:var(--font-sans)] text-[15px] leading-relaxed text-stone-800 focus:outline-none prose-rubrique-admin max-w-none",
      },
    },
    onUpdate: ({ editor: ed }) => onChange?.(ed.getJSON()),
  });

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <TipTapMenuBar editor={editor} />
      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div className="min-h-[320px] animate-pulse bg-stone-50" aria-hidden />
      )}
    </div>
  );
}
