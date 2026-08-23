const noteModules = import.meta.glob<string>("./warmup-notes/*.txt", {
  query: "?raw",
  import: "default",
  eager: true,
})

export function warmupNoteForDeck(deckId: string): string {
  return noteModules[`./warmup-notes/${deckId}.txt`] ?? ""
}
