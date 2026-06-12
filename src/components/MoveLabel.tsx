import type { CSSProperties } from "react"
import type { Partner } from "../types/domain"

interface MoveLabelProps {
  move: { text: string, partner?: Partner }
  style?: CSSProperties
}

export default function MoveLabel({ move, style }: MoveLabelProps) {
  return (
    <span className={move.partner === "B" ? "partner-b" : "partner-a"} style={style}>
      {move.text}
    </span>
  )
}
