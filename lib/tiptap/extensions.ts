import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { ArticleImage } from "@/lib/tiptap/article-image";
import { ArticleGallery } from "@/lib/tiptap/article-gallery";
import { FontNumberStyle } from "@/lib/tiptap/font-number-style";

export function getTiptapExtensions(placeholder?: string) {
  return [
    StarterKit,
    FontNumberStyle,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: "noopener noreferrer", class: "underline decoration-stone-400 underline-offset-2" },
    }),
    ArticleImage.configure({
      HTMLAttributes: { class: "h-auto w-full max-w-full object-contain" },
    }),
    ArticleGallery,
    ...(placeholder
      ? [
          Placeholder.configure({
            placeholder,
          }),
        ]
      : []),
  ];
}
