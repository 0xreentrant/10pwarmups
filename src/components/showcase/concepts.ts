export interface ShowcaseConcept {
  id: string
  label: string
  tagline: string
}

export const SHOWCASE_CONCEPTS: ShowcaseConcept[] = [
  {
    id: "dusk2",
    label: "Dusk 2",
    tagline: "Full-bleed dissolve with Slap In on the buzzer and a sharp Blackout payoff when you call it right - the verdict flashes for a blink before the tape rolls on.",
  },
  {
    id: "cinema-review",
    label: "Cinema Review",
    tagline: "Review without the scrollable move list: full-bleed tape, scrub every move, Train swaps back to training.",
  },
]

export const DEMO_VIDEO_SRC = "/videos/g1-lockdown.mp4"
export const DEMO_DECK_ID = "G1"
