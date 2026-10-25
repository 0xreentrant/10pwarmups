let noteOverrides: Record<string, string> | null = null

export function applyWarmupNotes(notes: Record<string, string>) {
  noteOverrides = notes
}

export function warmupNoteForDeck(deckId: string): string {
  return noteOverrides?.[deckId] ?? ""
}
