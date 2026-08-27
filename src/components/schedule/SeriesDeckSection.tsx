import DeckRow from "../DeckRow"
import { DECKS, SERIES } from "../../data/decks"
import { deckHasTaggedMoves } from "../../utils/deckTimestamps"
import type { SeriesId } from "../../data/warmupSchedule"
import type { ProgressMap } from "../../types/domain"

function EmptyDeckList() {
  return (
    <p className="py-3 text-[11px] text-muted tracking-wide">Stay tuned for new exercises</p>
  )
}

interface SeriesDeckSectionProps {
  letter: SeriesId
  progress: ProgressMap
  onDeckClick: (deckId: string) => void
  onReviewClick: (deckId: string) => void
  demoFirstRow?: boolean
}

export default function SeriesDeckSection({
  letter,
  progress,
  onDeckClick,
  onReviewClick,
  demoFirstRow = false,
}: SeriesDeckSectionProps) {
  const series = SERIES.find(s => s.id === letter)!
  const seriesDecks = DECKS
    .filter(d => d.series === letter)
    .filter(d => deckHasTaggedMoves(d.id, d.moves.length))

  return (
    <div id={`series-${letter}`} className="scroll-mt-3 mb-5">
      <div className="font-disp font-bold text-[0.7rem] tracking-[0.18em] uppercase text-muted pt-1 pb-1.5 border-b border-border mb-1">
        Series {series.id} - {series.name}
      </div>
      {seriesDecks.length === 0 ? (
        <EmptyDeckList />
      ) : (
        <table className="w-full table-fixed border-collapse">
          <tbody>
            {seriesDecks.map((deck, index) => (
              <DeckRow
                key={deck.id}
                deck={deck}
                progress={progress}
                onDeckClick={onDeckClick}
                onReviewClick={onReviewClick}
                demoReview={demoFirstRow && index === 0}
                demoTrain={demoFirstRow && index === 0}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
