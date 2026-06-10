import { useEffect } from "react"
import { DECKS } from "../data/decks"
import { deckLabel, formatRelativeDate } from "../utils/deckUtils"
import * as analytics from "../utils/analytics"

function AllDecksOverview({ progress, onDeckSelect }) {
  const completedDecks = DECKS.filter(d => {
    const p = progress[d.id]
    return p && p.bestStreak === d.moves.length
  }).length
  const totalAttempts = DECKS.reduce((sum, d) => sum + (progress[d.id]?.attempts.length ?? 0), 0)

  return (
    <div>
      <fieldset style={{ marginBottom: 16 }}>
        <legend>Overall</legend>
        <table style={{ width: "100%" }}>
          <tbody>
            <tr className="stat-row"><td>Completed</td><td>{completedDecks}/{DECKS.length}</td></tr>
            <tr className="stat-row"><td>Total attempts</td><td>{totalAttempts}</td></tr>
          </tbody>
        </table>
      </fieldset>
      <span className="section-label">All Decks</span>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "6px 0", fontFamily: "var(--font-disp)", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>Deck</th>
            <th style={{ textAlign: "left", padding: "6px 14px", fontFamily: "var(--font-disp)", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>Best</th>
            <th style={{ textAlign: "left", padding: "6px 0", fontFamily: "var(--font-disp)", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>Attempts</th>
          </tr>
        </thead>
        <tbody>
          {DECKS.map(d => {
            const p = progress[d.id] || { bestStreak: 0, attempts: [] }
            const done = p.bestStreak === d.moves.length
            return (
              <tr key={d.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                <td style={{ padding: "5px 0" }}>
                  <button className="btn-ghost" style={{ padding: 0, color: done ? "var(--green)" : "var(--muted)", textDecoration: "underline", fontSize: "0.85rem", fontFamily: "var(--font-disp)", fontWeight: 700 }}
                    onClick={() => onDeckSelect(d.id)}>
                    {deckLabel(d)}
                  </button>
                </td>
                <td style={{ padding: "5px 14px", fontSize: 12, color: "var(--muted)" }}>{p.bestStreak}/{d.moves.length}</td>
                <td style={{ padding: "5px 0", fontSize: 12, color: "var(--muted)" }}>{p.attempts.length}</td>
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
      <span className="deck-id" style={{ display: "block", marginBottom: 2 }}>{deck.id}</span>
      <h3 style={{ marginBottom: 16 }}>{deck.name}</h3>
      <fieldset style={{ marginBottom: 16 }}>
        <legend>Summary</legend>
        <table style={{ width: "100%" }}>
          <tbody>
            <tr className="stat-row"><td>Best streak</td><td>{prog.bestStreak}/{total}</td></tr>
            <tr className="stat-row"><td>Total attempts</td><td>{prog.attempts.length}</td></tr>
            <tr className="stat-row"><td>Last played</td><td>{formatRelativeDate(prog.lastAttemptDate) || "—"}</td></tr>
          </tbody>
        </table>
      </fieldset>

      {prog.attempts.length === 0
        ? <p className="meta">No attempts yet.</p>
        : <fieldset>
            <legend>Attempt history</legend>
            <table className="attempts-table" style={{ width: "100%" }}>
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
    <div style={{ paddingTop: 20, paddingBottom: 48 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
        <button className="btn-ghost" onClick={onBack} style={{ padding: "6px 0" }}>←</button>
        <h2>Progress</h2>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="section-label" style={{ margin: 0, whiteSpace: "nowrap" }}>Deck</span>
          <select value={deckId || ""} onChange={e => onDeckSelect(e.target.value || null)} style={{ flex: 1 }}>
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
