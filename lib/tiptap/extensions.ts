import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { ArticleImage } from "@/lib/tiptap/article-image";

export function getTiptapExtensions(placeholder?: string) {
  return [
    StarterKit,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: "noopener noreferrer", class: "underline decoration-stone-400 underline-offset-2" },
    }),
    ArticleImage.configure({
      HTMLAttributes: { class: "max-h-[480px] w-full object-contain" },
    }),
    ...(placeholder
      ? [
          Placeholder.configure({
            placeholder,
          }),
        ]
      : []),
  ];
}
