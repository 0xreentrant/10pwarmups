const noteModules = import.meta.glob<string>("../src/data/warmup-notes/*.txt", {
  query: "?raw",
  import: "default",
  eager: true,
})

export function seedNoteMap(): Record<string, string> {
  const notes: Record<string, string> = {}
  for (const [filePath, text] of Object.entries(noteModules)) {
    const id = filePath.split("/").pop()?.replace(/\.txt$/, "")
    if (id) notes[id] = text
  }
  return notes
}
