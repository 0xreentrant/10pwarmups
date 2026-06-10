import * as analytics from "../utils/analytics"

export default function DeckLink({ link }) {
  if (!link) return null
  return (
    <a 
      className="deck-link" 
      href={link} 
      target="_blank" 
      rel="noopener noreferrer"
      onClick={() => {
        analytics.event({
          action: 'video_link_clicked',
          category: 'Engagement',
          label: link
        })
      }}
    >
     🎞️ Video (Online) ↗
    </a>
  )
}
