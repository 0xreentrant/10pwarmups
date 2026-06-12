import { useEffect } from "react"
import { DECKS } from "../data/decks"
import { deckLabel, formatRelativeDate } from "../utils/deckUtils"
import * as analytics from "../utils/analytics"

const TABLE_HEAD = "text-left py-1.5 font-disp text-[0.65rem] tracking-[0.15em] uppercase text-muted font-semibold border-b border-border"
const TABLE_HEAD_PAD = `${TABLE_HEAD} pl-3.5`
const STAT_LABEL = "py-1 text-xs text-muted"
const STAT_VALUE = "py-1 pl-5 text-xs text-text font-semibold"

function AllDecksOverview({ progress, onDeckSelect }) {
  const completedDecks = DECKS.filter(d => {
    const p = progress[d.id]
    return p && p.bestStreak === d.moves.length
  }).length
  const totalAttempts = DECKS.reduce((sum, d) => sum + (progress[d.id]?.attempts.length ?? 0), 0)

  return (
    <div>
      <fieldset className="mb-4">
        <legend>Overall</legend>
        <table className="w-full">
          <tbody>
            <tr><td className={STAT_LABEL}>Completed</td><td className={STAT_VALUE}>{completedDecks}/{DECKS.length}</td></tr>
            <tr><td className={STAT_LABEL}>Total attempts</td><td className={STAT_VALUE}>{totalAttempts}</td></tr>
          </tbody>
        </table>
      </fieldset>
      <span className="block font-disp text-[0.65rem] font-bold tracking-[0.2em] uppercase text-muted mb-2">All Decks</span>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={TABLE_HEAD}>Deck</th>
            <th className={TABLE_HEAD_PAD}>Best</th>
            <th className={TABLE_HEAD}>Attempts</th>
          </tr>
        </thead>
        <tbody>
          {DECKS.map(d => {
            const p = progress[d.id] || { bestStreak: 0, attempts: [] }
            const done = p.bestStreak === d.moves.length
            return (
              <tr key={d.id} className="border-b border-surface">
                <td className="py-1.5">
                  <button
                    className={`btn btn-ghost p-0 underline text-[0.85rem] font-disp font-bold ${done ? "text-green" : "text-muted"}`}
                    onClick={() => onDeckSelect(d.id)}
                  >
                    {deckLabel(d)}
                  </button>
                </td>
                <td className="py-1.5 pl-3.5 text-xs text-muted">{p.bestStreak}/{d.moves.length}</td>
                <td className="py-1.5 text-xs text-muted">{p.attempts.length}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DeckProgress({ deck, prog }) {
  const total = deck.moves.length
  return (
    <div>
      <span className="block mb-0.5 font-disp font-extrabold text-base tracking-wide text-muted min-w-8">{deck.id}</span>
      <h3 className="mb-4">{deck.name}</h3>
      <fieldset className="mb-4">
        <legend>Summary</legend>
        <table className="w-full">
          <tbody>
            <tr><td className={STAT_LABEL}>Best streak</td><td className={STAT_VALUE}>{prog.bestStreak}/{total}</td></tr>
            <tr><td className={STAT_LABEL}>Total attempts</td><td className={STAT_VALUE}>{prog.attempts.length}</td></tr>
            <tr><td className={STAT_LABEL}>Last played</td><td className={STAT_VALUE}>{formatRelativeDate(prog.lastAttemptDate) || "—"}</td></tr>
          </tbody>
        </table>
      </fieldset>

      {prog.attempts.length === 0
        ? <p className="text-[11px] text-muted mt-0.5">No attempts yet.</p>
        : <fieldset>
            <legend>Attempt history</legend>
            <table className="attempts-table w-full">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Streak</th>
                  <th>Wrong</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {[...prog.attempts].reverse().map((att, i) => {
                  const num = prog.attempts.length - i
                  return (
                    <tr key={i}>
                      <td>{num}{att.abandoned ? " ↩" : ""}</td>
                      <td>{att.finalStreak}/{total}</td>
                      <td>{att.wrongMoves.length === 0 ? "—" : att.wrongMoves.map(mv => `M${mv + 1}`).join(", ")}</td>
                      <td>{formatRelativeDate(att.date)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </fieldset>
      }
    </div>
  )
}

export default function ProgressScreen({ deckId, progress, onBack, onDeckSelect }) {
  const deck = deckId ? DECKS.find(d => d.id === deckId) : null
  const prog = deck ? progress[deck.id] : null

  useEffect(() => {
    analytics.pageview(deckId ? `/progress/${deckId}` : '/progress')
  }, [deckId])

  return (
    <div className="pt-5 pb-12">
      <div className="flex gap-3 items-center mb-5">
        <button className="btn btn-ghost py-1.5 px-0" onClick={onBack}>←</button>
        <h2>Progress</h2>
      </div>

      <div className="mb-[18px]">
        <label className="flex items-center gap-2.5">
          <span className="font-disp text-[0.65rem] font-bold tracking-[0.2em] uppercase text-muted m-0 whitespace-nowrap">Deck</span>
          <select value={deckId || ""} onChange={e => onDeckSelect(e.target.value || null)} className="flex-1">
            <option value="">— All decks —</option>
            {DECKS.map(d => (
              <option key={d.id} value={d.id}>{d.series ? `${d.id}: ` : ""}{d.name}</option>
            ))}
          </select>
        </label>
      </div>

      {!deck && <AllDecksOverview progress={progress} onDeckSelect={onDeckSelect} />}
      {deck && prog && <DeckProgress deck={deck} prog={prog} />}
    </div>
  )
}
