import { useEffect } from "react"
import DeckLink from "./DeckLink"
import ResetConfirmPopover from "./ResetConfirmPopover"
import { DECKS, SERIES } from "../data/decks"
import * as analytics from "../utils/analytics"

const NAMED_FLOWS = DECKS.filter(d => !d.series)

function DeckRow({ deck, progress, onDeckClick, showId }) {
  const prog = progress[deck.id] || { currentStreak: 0, bestStreak: 0, attempts: [] }
  const total = deck.moves.length
  const label = prog.attempts.length === 0
    ? "untrained"
    : prog.bestStreak === total
    ? "complete"
    : "in progress"

  return (
    <tr>
      {showId && (
        <td style={{ padding: "8px 0", verticalAlign: "top", width: 36 }}>
          <span className="deck-id">{deck.id}</span>
        </td>
      )}
      <td style={{ padding: "8px 10px 8px 0", verticalAlign: "top" }} colSpan={showId ? 1 : 2}>
        <div className="deck-name">{deck.name}</div>
        <DeckLink link={deck.link} />
        <div className="meta">{prog.bestStreak}/{total} · {label}</div>
        <progress value={prog.bestStreak} max={total} style={{ marginTop: 5 }} />
      </td>
      <td style={{ padding: "8px 0", verticalAlign: "middle", whiteSpace: "nowrap" }}>
        <button className="btn btn-primary" onClick={() => {
          analytics.event({
            action: 'deck_selected',
            category: 'Training',
            label: `${deck.id} - ${deck.name}`
          })
          onDeckClick(deck.id)
        }}>Train</button>
      </td>
    </tr>
  )
}

export default function HomeScreen({ progress, onDeckClick, onStats, onReset, resetConfirm, onCancelReset }) {
  useEffect(() => {
    analytics.pageview('/home')
  }, [])

  return (
    <div style={{ paddingTop: 28, paddingBottom: 48 }}>
      <h1 style={{ marginBottom: 4 }}>10th Planet</h1>
      <h1 style={{ marginBottom: 6, color: "var(--accent)" }}>Warmup Trainer</h1>
      <p className="meta" style={{ marginBottom: 20, letterSpacing: "0.06em" }}>openthesystem.app</p>
      <p className="meta" style={{ marginBottom: 32, letterSpacing: "0.1em", textTransform: "uppercase" }}>34 decks · 8 series</p>

      <nav className="series-nav">
        {SERIES.map(series => (
          <a key={series.id} href={`#series-${series.id}`}>{series.id}</a>
        ))}
        {NAMED_FLOWS.length > 0 && <a href="#named-flows">Named Flows</a>}
      </nav>

      {SERIES.map(series => {
        const seriesDecks = DECKS.filter(d => d.series === series.id)
        return (
          <div key={series.id} id={`series-${series.id}`} className="series-section" style={{ marginBottom: 28 }}>
            <div className="series-heading">Series {series.id} — {series.name}</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {seriesDecks.map(d => (
                  <DeckRow key={d.id} deck={d} progress={progress} onDeckClick={onDeckClick} showId />
                ))}
              </tbody>
            </table>
          </div>
        )
      })}

      {NAMED_FLOWS.length > 0 && (
        <div id="named-flows" className="series-section" style={{ marginBottom: 28 }}>
          <div className="series-heading">Named Flows</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {NAMED_FLOWS.map(d => (
                <DeckRow key={d.id} deck={d} progress={progress} onDeckClick={onDeckClick} showId={false} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <hr />
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button className="btn" onClick={onStats}>Stats</button>
        <button
          className="btn"
          onClick={() => { if (!resetConfirm) onReset() }}
        >Reset all</button>
      </div>
      <ResetConfirmPopover
        open={resetConfirm}
        onConfirm={onReset}
        onCancel={onCancelReset}
      />
    </div>
  )
}
