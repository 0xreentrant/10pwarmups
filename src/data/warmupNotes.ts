const noteModules = import.meta.glob<string>("./warmup-notes/*.txt", {
  query: "?raw",
  import: "default",
  eager: true,
})

let noteOverrides: Record<string, string> | null = null

export function applyWarmupNotes(notes: Record<string, string>) {
  noteOverrides = notes
}

export function warmupNoteForDeck(deckId: string): string {
  if (noteOverrides) return noteOverrides[deckId] ?? ""
  return noteModules[`./warmup-notes/${deckId}.txt`] ?? ""
}
