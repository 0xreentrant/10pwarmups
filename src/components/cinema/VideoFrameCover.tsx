import { useEffect, useState } from "react"

export function VideoFrameCover({ show, src }: { show: boolean, src: string | null }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [src])
  if (!show) return null
  return (
    <>
      {src && !failed && (
        <img
          className="clip-poster"
          src={src}
          alt=""
          onError={() => setFailed(true)}
        />
      )}
      <div className="clip-spinner" role="status" aria-label="Loading video" />
    </>
  )
}

export const clipPosterCss = `
  .clip-poster {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
    z-index: 0;
  }
  .clip-spinner {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 6;
    width: 28px;
    height: 28px;
    margin: -14px 0 0 -14px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.28);
    border-top-color: #fff;
    pointer-events: none;
    animation: clip-spin 0.7s linear infinite;
  }
  @keyframes clip-spin {
    to { transform: rotate(360deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    .clip-spinner { animation: none; }
  }
`
