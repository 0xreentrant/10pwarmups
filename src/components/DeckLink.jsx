export default function DeckLink({ link }) {
  if (!link) return null
  return (
    <a className="deck-link" href={link} target="_blank" rel="noopener noreferrer">
     🎞️ Video (Online) ↗
    </a>
  )
}
