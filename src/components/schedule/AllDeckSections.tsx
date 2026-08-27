import DeckRow from "../DeckRow"
import { DECKS, SERIES } from "../../data/decks"
import { deckHasTaggedMoves } from "../../utils/deckTimestamps"
import type { SeriesId } from "../../data/warmupSchedule"
import type { ProgressMap } from "../../types/domain"
import SeriesDeckSection from "./SeriesDeckSection"

const NAMED_FLOWS = DECKS.filter(d => !d.series)

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
  const namedFlows = NAMED_FLOWS.filter(d => deckHasTaggedMoves(d.id, d.moves.length))

  return (
    <>
      {SERIES.map(series => (
        <SeriesDeckSection
          key={series.id}
          letter={series.id as SeriesId}
          progress={progress}
          onDeckClick={onDeckClick}
          onReviewClick={onReviewClick}
        />
      ))}
      <div id="named-flows" className="scroll-mt-3 mb-5">
        <div className="font-disp font-bold text-[0.7rem] tracking-[0.18em] uppercase text-muted pt-1 pb-1.5 border-b border-border mb-1">
          Named Flows
        </div>
        {namedFlows.length === 0 ? (
          <EmptyDeckList />
        ) : (
          <table className="w-full table-fixed border-collapse">
            <tbody>
              {namedFlows.map(deck => (
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
