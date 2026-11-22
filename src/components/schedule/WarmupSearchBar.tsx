import { useEffect, useId, useRef, useState } from "react"
import {
  buildWarmupSearchEntries,
  searchWarmups,
  type WarmupSearchHit,
} from "../../utils/warmupSearch"

const DEBOUNCE_MS = 150

interface WarmupSearchBarProps {
  onSelect: (deckId: string) => void
}

export default function WarmupSearchBar({ onSelect }: WarmupSearchBarProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const entriesRef = useRef(buildWarmupSearchEntries())
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const [open, setOpen] = useState(false)
  const [hits, setHits] = useState<WarmupSearchHit[]>([])

  useEffect(() => {
    entriesRef.current = buildWarmupSearchEntries()
  })

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const next = searchWarmups(debounced, entriesRef.current)
    setHits(next)
    setOpen(debounced.trim().length > 0 && next.length > 0)
  }, [debounced])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const selectHit = (hit: WarmupSearchHit) => {
    setQuery("")
    setDebounced("")
    setHits([])
    setOpen(false)
    onSelect(hit.deckId)
  }

  return (
    <div ref={rootRef} className="relative mb-3">
      <label
        htmlFor={listId}
        className="mb-1.5 block text-[0.65rem] tracking-[0.14em] uppercase text-muted"
      >
        search by move
      </label>
      <input
        id={listId}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${listId}-listbox`}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Search moves…"
        value={query}
        onChange={event => setQuery(event.target.value)}
        onFocus={() => {
          if (debounced.trim() && hits.length > 0) setOpen(true)
        }}
        className={[
          "w-full border border-border bg-surface px-3 py-2",
          "text-[0.85rem] text-text placeholder:text-muted",
          "outline-none focus:border-accent",
        ].join(" ")}
      />
      {open && hits.length > 0 && (
        <ul
          id={`${listId}-listbox`}
          role="listbox"
          aria-label="Matching warmups"
          className="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-y-auto border border-border bg-surface py-1 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
        >
          {hits.map(hit => (
            <li key={`${hit.deckId}:${hit.moveText}`} role="presentation">
              <button
                type="button"
                role="option"
                className={[
                  "w-full text-left px-3 py-2 border-0 bg-transparent cursor-pointer",
                  "hover:bg-[color-mix(in_srgb,var(--color-accent),transparent_90%)]",
                ].join(" ")}
                onClick={() => selectHit(hit)}
              >
                <span className="block font-disp font-semibold text-[0.9rem] text-text tracking-tight">
                  {hit.moveText}
                </span>
                <span className="block text-[11px] text-muted tracking-wide uppercase mt-0.5">
                  {hit.deckId}
                  {hit.series ? ` · ${hit.series}` : ""}
                  {hit.deckName && hit.deckName !== hit.series ? ` · ${hit.deckName}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {debounced.trim().length > 0 && hits.length === 0 && (
        <p className="mt-1.5 text-[11px] text-muted tracking-wide">No matching moves</p>
      )}
    </div>
  )
}
