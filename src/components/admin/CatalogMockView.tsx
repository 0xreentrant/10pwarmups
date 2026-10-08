import { useState } from "react"
import { DECKS } from "../../data/decks"

type Section = { id: string; name: string }
type Entry = { id: string; title: string; sectionId: string }

const SECTIONS: Section[] = [
  { id: "A", name: "Granbys" },
  { id: "B", name: "Sit-Ups & Takedowns" },
  { id: "C", name: "Guard Passing" },
  { id: "D", name: "Leg Locks" },
  { id: "E", name: "Half Guard" },
  { id: "F", name: "Lockdown" },
  { id: "G", name: "Side Control" },
  { id: "H", name: "De La Riva" },
]

function nextEntryId(sectionId: string, entries: Entry[]) {
  const nums = entries
    .filter(entry => entry.sectionId === sectionId && entry.id.startsWith(sectionId))
    .map(entry => Number(entry.id.slice(sectionId.length)))
    .filter(n => Number.isFinite(n))
  const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1
  return `${sectionId}${next}`
}

export default function CatalogMockView() {
  const [sections, setSections] = useState<Section[]>(SECTIONS)
  const [entries, setEntries] = useState<Entry[]>(
    DECKS.map(deck => ({ id: deck.id, title: deck.name, sectionId: deck.series ?? "A" })),
  )
  const [newSectionId, setNewSectionId] = useState("")
  const [newSectionName, setNewSectionName] = useState("")
  const [addingIn, setAddingIn] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")

  function addSection() {
    const id = newSectionId.trim().toUpperCase()
    const name = newSectionName.trim()
    if (!id || !name || sections.some(section => section.id === id)) return
    setSections(prev => [...prev, { id, name }])
    setNewSectionId("")
    setNewSectionName("")
  }

  function addEntry(sectionId: string) {
    const title = newTitle.trim()
    if (!title) return
    const id = nextEntryId(sectionId, entries)
    setEntries(prev => [...prev, { id, title, sectionId }])
    setAddingIn(null)
    setNewTitle("")
  }

  return (
    <div className="mx-auto max-w-[520px] px-4 py-6">
      <h1 className="mb-4 text-xl">Catalog</h1>
      {sections.map(section => {
        const sectionEntries = entries.filter(entry => entry.sectionId === section.id)
        return (
          <section key={section.id} className="mb-6 border border-border p-3">
            <label className="mb-3 flex flex-col gap-1 text-[11px] uppercase tracking-wider text-muted">
              Section {section.id} name
              <input
                className="border border-border bg-surface px-2 py-1 text-sm normal-case tracking-normal text-text"
                value={section.name}
                onChange={e => {
                  const name = e.target.value
                  setSections(prev => prev.map(item => item.id === section.id ? { ...item, name } : item))
                }}
              />
            </label>
            {sectionEntries.map(entry => (
              <div key={entry.id} className="mb-3 grid grid-cols-[1fr_5rem] gap-2">
                <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-muted">
                  {entry.id} title
                  <input
                    className="border border-border bg-surface px-2 py-1 text-sm normal-case tracking-normal text-text"
                    value={entry.title}
                    onChange={e => {
                      const title = e.target.value
                      setEntries(prev => prev.map(item => item.id === entry.id ? { ...item, title } : item))
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-muted">
                  {entry.id} section
                  <select
                    className="border border-border bg-surface px-2 py-1 text-sm text-text"
                    value={entry.sectionId}
                    onChange={e => {
                      const sectionId = e.target.value
                      setEntries(prev => prev.map(item => item.id === entry.id ? { ...item, sectionId } : item))
                    }}
                  >
                    {sections.map(option => (
                      <option key={option.id} value={option.id}>{option.id}</option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
            <button
              type="button"
              className="text-muted text-[11px] uppercase tracking-wider"
              onClick={() => {
                setAddingIn(section.id)
                setNewTitle("")
              }}
            >
              Add entry
            </button>
            {addingIn === section.id && (
              <div className="mt-2 flex items-end gap-2">
                <label className="flex flex-1 flex-col gap-1 text-[11px] uppercase tracking-wider text-muted">
                  New entry title
                  <input
                    className="border border-border bg-surface px-2 py-1 text-sm normal-case tracking-normal text-text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="text-accent text-[11px] uppercase tracking-wider"
                  onClick={() => addEntry(section.id)}
                >
                  Add
                </button>
              </div>
            )}
          </section>
        )
      })}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-muted">
          New section id
          <input
            className="w-16 border border-border bg-surface px-2 py-1 text-sm uppercase text-text"
            value={newSectionId}
            onChange={e => setNewSectionId(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-muted">
          New section name
          <input
            className="border border-border bg-surface px-2 py-1 text-sm normal-case tracking-normal text-text"
            value={newSectionName}
            onChange={e => setNewSectionName(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="text-accent text-[11px] uppercase tracking-wider"
          onClick={addSection}
        >
          Add section
        </button>
      </div>
    </div>
  )
}
