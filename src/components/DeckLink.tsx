import * as analytics from "../utils/analytics"

interface DeckLinkProps {
  link?: string
  variant?: "emoji" | "full"
}

const LINK_BASE = "text-muted no-underline hover:text-accent hover:underline"

export default function DeckLink({ link, variant = "full" }: DeckLinkProps) {
  if (!link) return null

  const onClick = () => {
    analytics.event({
      action: "video_link_clicked",
      category: "Engagement",
      label: link,
    })
  }

  if (variant === "emoji") {
    return (
      <a
        className={`flex flex-col items-center gap-0.5 ${LINK_BASE}`}
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Watch video (online)"
        onClick={onClick}
      >
        <span className="text-3xl leading-none" aria-hidden>🎞️</span>
        <span className="text-[10px] leading-tight text-center">
          watch<br />video
        </span>
      </a>
    )
  }

  return (
    <a
      className={`inline-block text-lg tracking-wide mt-1.5 ${LINK_BASE}`}
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
    >
      🎞️ Video (Online) ↗
    </a>
  )
}
