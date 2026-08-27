import type { Partner } from "../types/domain"
import { normalizePlayers } from "../utils/movePlayers"

interface PartnerTagsProps {
  players: Partner | readonly Partner[]
  classPrefix: "ct" | "bl"
  pop?: boolean
  staggerMs?: number
}

export default function PartnerTags({
  players,
  classPrefix,
  pop = false,
  staggerMs = 90,
}: PartnerTagsProps) {
  const list = normalizePlayers(players)
  return (
    <span className={`${classPrefix}-partner-tags`}>
      {list.map((p, i) => (
        <span
          key={p}
          className={[
            `${classPrefix}-partner-tag`,
            `${classPrefix}-partner-tag--${p}`,
            pop ? `${classPrefix}-partner-tag--pop` : "",
          ].filter(Boolean).join(" ")}
          style={pop && i > 0 ? { animationDelay: `${i * staggerMs}ms` } : undefined}
        >
          Person {p}
        </span>
      ))}
    </span>
  )
}
