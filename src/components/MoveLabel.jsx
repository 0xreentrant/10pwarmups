export default function MoveLabel({ move, className = "" }) {
  const partnerClass = move.partner === "B" ? "text-partner-b" : "text-partner-a"
  return (
    <span className={`${partnerClass} ${className}`.trim()}>
      {move.text}
    </span>
  )
}
