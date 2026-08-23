import { useState, type ComponentType } from "react"
import { Link } from "@tanstack/react-router"
import { DECKS } from "../../data/decks"
import type { Deck } from "../../types/domain"
import BleedDusk2Shell from "./bleed/BleedDusk2Shell"
import { DUSK2_BLEED_VARIANT } from "./bleed/bleedVariant"
import CinemaReviewDemo from "./CinemaReviewDemo"
import { DEMO_DECK_ID, DEMO_VIDEO_SRC, SHOWCASE_CONCEPTS } from "./concepts"

interface ConceptProps {
  deck: Deck
  videoSrc: string
}

const CONCEPT_COMPONENTS: Record<string, ComponentType<ConceptProps>> = {
  "cinema-review": CinemaReviewDemo,
}

export default function ShowcaseScreen() {
  const [activeId, setActiveId] = useState(SHOWCASE_CONCEPTS[0].id)

  const deck = DECKS.find(d => d.id === DEMO_DECK_ID)!
  const active = SHOWCASE_CONCEPTS.find(c => c.id === activeId)!
  const ActiveComponent = CONCEPT_COMPONENTS[activeId]

  return (
    <div className="pt-4 pb-16">
      <ShowcaseStyles />
      <div className="cs-head">
        <h1 className="text-accent">Video In The Flow</h1>
      </div>

      <p className="cs-blurb">
        Full-bleed cinema demos for training and review.{" "}
        <span className="text-muted">{deck.id} · {deck.name}</span>
      </p>

      <div className="cs-tabs">
        {SHOWCASE_CONCEPTS.map(c => (
          <button
            key={c.id}
            type="button"
            className={`cs-tab ${c.id === activeId ? "cs-tab--active" : ""}`}
            onClick={() => setActiveId(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="cs-tagline">{active.tagline}</p>

      {activeId === "dusk2" ? (
        <BleedDusk2Shell key={activeId} deck={deck} videoSrc={DEMO_VIDEO_SRC} variant={DUSK2_BLEED_VARIANT} />
      ) : (
        <ActiveComponent key={activeId} deck={deck} videoSrc={DEMO_VIDEO_SRC} />
      )}

      <Link to="/" className="btn btn-ghost inline-block mt-8">← Back home</Link>
    </div>
  )
}

function ShowcaseStyles() {
  return (
    <style>{`
      .cs-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 6px;
      }

      .cs-head h1 {
        font-size: 1.6rem;
        margin: 0;
      }

      .cs-blurb {
        font-size: 11px;
        line-height: 1.5;
        margin-bottom: 12px;
      }

      .cs-tabs {
        display: flex;
        gap: 2px;
        overflow-x: auto;
        border-bottom: 1px solid var(--color-border);
        margin-bottom: 8px;
      }

      .cs-tab {
        flex-shrink: 0;
        font-family: var(--font-family-disp);
        font-weight: 700;
        font-size: 0.72rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--color-muted);
        padding: 8px 10px;
        border-bottom: 2px solid transparent;
        white-space: nowrap;
        transition: color 0.15s, border-color 0.15s;
      }

      .cs-tab:hover {
        color: var(--color-text);
      }

      .cs-tab--active {
        color: var(--color-text);
        border-color: var(--color-accent);
      }

      .cs-tagline {
        font-size: 11px;
        line-height: 1.5;
        color: color-mix(in srgb, var(--color-text), var(--color-muted) 35%);
        margin-bottom: 12px;
        max-width: 62ch;
      }
    `}</style>
  )
}
