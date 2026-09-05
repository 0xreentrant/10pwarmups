import type { Partner } from "../types/domain"
import { moveLabelClass, normalizePlayers } from "../utils/movePlayers"

interface MoveLabelProps {
  move: { text: string, players?: Partner | readonly Partner[] }
  className?: string
}

export default function MoveLabel({ move, className = "" }: MoveLabelProps) {
  const partnerClass = moveLabelClass(normalizePlayers(move.players ?? ["A"]))
  return (
    <span className={`${partnerClass} ${className}`.trim()}>
      {move.text}
    </span>
  )
}
