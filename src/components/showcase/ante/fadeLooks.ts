export type FadeVariantId = "dusk" | "dissolve"

export interface FadeLook {
  filter: string
  videoOpacity: number
  /** 0-1 strength of the variant's veil layer (static). */
  veil: number
}

/** How the frame leaves, as a smooth function of clock progress p (0 open, 1 buzzer). */
export function fadeLook(id: FadeVariantId, p: number): FadeLook {
  const t = Math.min(1, Math.max(0, p))
  switch (id) {
    case "dusk":
      return {
        filter: `brightness(${(1 - 0.95 * t).toFixed(3)}) saturate(${(1 - 0.55 * t).toFixed(3)})`,
        videoOpacity: 1,
        veil: 0,
      }
    case "dissolve":
      return {
        filter: `grayscale(${t.toFixed(3)})`,
        videoOpacity: 1 - 0.97 * t,
        veil: 0.6 * t,
      }
  }
}
