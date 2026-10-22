import { useEffect, useLayoutEffect, useRef, useState } from "react"

const FRAME_EPS_SEC = 0.05

/**
 * True until the element has presented `time`.
 * A seek clears on `seeked`. A frame already at that time clears on
 * requestVideoFrameCallback. `token` resets the wait when the move changes
 * but the timestamp does not.
 */
export function useAwaitingVideoFrame(
  video: HTMLVideoElement | null,
  time: number | null,
  token: string,
): boolean {
  const key = time == null ? null : `${token}@${time}`
  const [awaiting, setAwaiting] = useState(key != null)
  const [seen, setSeen] = useState(key)
  if (key !== seen) {
    setSeen(key)
    setAwaiting(key != null)
  }
  const timeRef = useRef(time)
  timeRef.current = time

  useEffect(() => {
    if (key == null || !video) return
    let stopped = false
    let rvfcId = 0
    const hideIf = (presented: number) => {
      const want = timeRef.current
      if (stopped || want == null || video.seeking) return
      if (video.readyState < 2) return
      const delta = presented - want
      const held = video.paused && delta > FRAME_EPS_SEC
      if (delta < -FRAME_EPS_SEC || held) return
      stopped = true
      setAwaiting(false)
    }
    const onSeeked = () => hideIf(video.currentTime)
    const onFrame: VideoFrameRequestCallback = (_now, meta) => {
      if (stopped) return
      const presented = typeof meta.mediaTime === "number" ? meta.mediaTime : video.currentTime
      hideIf(presented)
      if (stopped || !video.requestVideoFrameCallback) return
      rvfcId = video.requestVideoFrameCallback(onFrame)
    }
    video.addEventListener("seeked", onSeeked)
    if (video.requestVideoFrameCallback) rvfcId = video.requestVideoFrameCallback(onFrame)
    else video.addEventListener("loadeddata", onSeeked)
    return () => {
      stopped = true
      video.removeEventListener("seeked", onSeeked)
      video.removeEventListener("loadeddata", onSeeked)
      video.cancelVideoFrameCallback?.(rvfcId)
    }
  }, [video, key])

  return awaiting
}

/** Drop the opacity transition for one flush so a poster handoff does not fade through black. */
export function useSnapMediaOpacity(el: HTMLElement | null, snapKey: boolean) {
  useLayoutEffect(() => {
    if (!el) return
    const prev = el.style.transition
    el.style.transition = "none"
    void el.offsetWidth
    el.style.transition = prev
  }, [el, snapKey])
}
