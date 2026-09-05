import MoveLabel from "./MoveLabel"
import type { QuestionOption } from "../types/domain"

interface OptionMoveTextProps {
  move: QuestionOption
  /** Partner color only after reveal so the correct option is not hinted early. */
  revealed?: boolean
}

export default function OptionMoveText({ move, revealed = false }: OptionMoveTextProps) {
  if (revealed && move.players?.length) {
    return <MoveLabel move={move} />
  }
  return <span>{move.text}</span>
}
