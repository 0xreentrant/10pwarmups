export default function MoveLabel({ move, className = "", monochrome = false }) {
  const partnerClass = monochrome
    ? ""
    : move.partner === "B" ? "text-partner-b" : "text-partner-a"
  return (
    <span className={`${partnerClass} ${className}`.trim()}>
      {move.text}
    </span>
  )
}
