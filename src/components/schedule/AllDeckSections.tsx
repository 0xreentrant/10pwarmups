import DeckRow from "../DeckRow"
import { DECKS, SERIES } from "../../data/decks"
import type { SeriesId } from "../../data/warmupSchedule"
import type { ProgressMap } from "../../types/domain"
import { isLetterSeriesId, SPECIAL_FLOW_SECTION_ID } from "../../utils/deckUtils"
import SeriesDeckSection from "./SeriesDeckSection"

function letterSeriesList() {
  return SERIES.filter(series => isLetterSeriesId(series.id))
}

function specialFlowDecks() {
  return DECKS.filter(d => d.series === SPECIAL_FLOW_SECTION_ID || !d.series)
}

function EmptyDeckList() {
  return (
    <p className="py-3 text-[11px] text-muted tracking-wide">Stay tuned for new exercises</p>
  )
}

interface AllDeckSectionsProps {
  progress: ProgressMap
  onDeckClick: (deckId: string) => void
  onReviewClick: (deckId: string) => void
}

export default function AllDeckSections({
  progress,
  onDeckClick,
  onReviewClick,
}: AllDeckSectionsProps) {
  const specialFlows = specialFlowDecks()

  return (
    <>
      {letterSeriesList().map(series => (
        <SeriesDeckSection
          key={series.id}
          letter={series.id as SeriesId}
          progress={progress}
          onDeckClick={onDeckClick}
          onReviewClick={onReviewClick}
        />
      ))}
      <div id={SPECIAL_FLOW_SECTION_ID} className="scroll-mt-3 mb-5">
        <div className="font-disp font-bold text-[0.7rem] tracking-[0.18em] uppercase text-muted pt-1 pb-1.5 border-b border-border mb-1">
          Special Flows
        </div>
        {specialFlows.length === 0 ? (
          <EmptyDeckList />
        ) : (
          <table className="w-full table-fixed border-collapse">
            <tbody>
              {specialFlows.map(deck => (
                <DeckRow
                  key={deck.id}
                  deck={deck}
                  progress={progress}
                  onDeckClick={onDeckClick}
                  onReviewClick={onReviewClick}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
