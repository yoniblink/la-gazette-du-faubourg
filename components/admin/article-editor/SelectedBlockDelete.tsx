"use client";

/** Bouton suppression flottant sur bloc sélectionné (style éditeur type Canva). */
export function SelectedBlockDelete({
  onRemove,
  label = "Supprimer ce bloc",
}: {
  onRemove: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      data-block-delete
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onRemove();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute -right-1 -top-1 z-[3] flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-zinc-300/90 bg-white text-zinc-500 shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-[color,background-color,border-color] hover:border-red-300/80 hover:bg-red-50 hover:text-red-600"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    </button>
  );
}
