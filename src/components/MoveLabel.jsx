export default function MoveLabel({ move, style }) {
  return (
    <span className={move.partner === "B" ? "partner-b" : "partner-a"} style={style}>
      {move.text}
    </span>
  )
}
