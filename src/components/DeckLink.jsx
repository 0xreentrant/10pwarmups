import * as analytics from "../utils/analytics"

export default function DeckLink({ link }) {
  if (!link) return null
  return (
    <a
      className="inline-block text-[11px] text-muted no-underline tracking-wide mt-0.5 hover:text-accent hover:underline"
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
