import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

export function getTiptapExtensions(placeholder?: string) {
  return [
    StarterKit,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: "noopener noreferrer", class: "underline decoration-stone-400 underline-offset-2" },
    }),
    Image.configure({
      HTMLAttributes: { class: "my-6 max-h-[480px] w-full rounded-lg object-contain" },
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
