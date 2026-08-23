import type { FadeVariantId } from "../ante/fadeLooks"

export interface BleedVariant {
  id: FadeVariantId
  title: string
  hint: string
  openLine: string
  buzzLine: string
  doneLine: string
}

export const DUSK2_BLEED_VARIANT: BleedVariant = {
  id: "dissolve",
  title: "Dusk 2",
  hint: "Full-bleed dissolve with Slap In on the buzzer and a sharp Blackout payoff when you're right.",
  openLine: "Signal's dropping.",
  buzzLine: "",
  doneLine: "You read through the static and earned the frame back every time.",
}
