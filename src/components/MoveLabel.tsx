import type { Partner } from "../types/domain"

interface MoveLabelProps {
  move: { text: string, partner?: Partner }
  className?: string
}

export default function MoveLabel({ move, className = "" }: MoveLabelProps) {
  const partnerClass = move.partner === "B" ? "text-partner-b" : "text-partner-a"
  return (
    <span className={`${partnerClass} ${className}`.trim()}>
      {move.text}
    </span>
  )
}
