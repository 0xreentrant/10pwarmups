import type { QuestionOption } from "../types/domain"

interface OptionMoveTextProps {
  move: QuestionOption
}

export default function OptionMoveText({ move }: OptionMoveTextProps) {
  return <span>{move.text}</span>
}
