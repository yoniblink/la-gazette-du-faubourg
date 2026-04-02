"use client";

export type EditorViewportMode = "desktop" | "mobile";

const MODES: { key: EditorViewportMode; label: string }[] = [
  { key: "desktop", label: "Ordinateur" },
  { key: "mobile", label: "Téléphone" },
];

/**
 * Icônes responsive centrées (style barre d’édition type Webflow / Elementor).
 */
export function EditorViewportToggle({
  value,
  onChange,
}: {
  value: EditorViewportMode;
  onChange: (next: EditorViewportMode) => void;
}) {
  return (
    <div
      className="flex items-center gap-0.5 rounded-md border border-zinc-600 bg-zinc-900 p-0.5"
      role="toolbar"
      aria-label="Largeur d’aperçu"
    >
      {MODES.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={`rounded px-2.5 py-2 transition-colors ${
            value === key
              ? "bg-zinc-700 text-zinc-50 ring-1 ring-zinc-500/60 shadow-sm"
              : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
          }`}
        >
          {key === "desktop" ? (
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
              <rect x="3" y="4" width="18" height="12" rx="1" />
              <path strokeLinecap="round" d="M8 20h8" />
            </svg>
          ) : (
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
              <rect x="8" y="2" width="8" height="20" rx="1.5" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}
