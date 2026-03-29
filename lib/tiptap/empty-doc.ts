/** Minimal valid TipTap / ProseMirror document (empty paragraph). */
export const emptyTipTapDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
} as const;

export function paragraphsToTipTapDoc(paragraphs: string[]) {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: text ? [{ type: "text", text }] : [],
    })),
  };
}
