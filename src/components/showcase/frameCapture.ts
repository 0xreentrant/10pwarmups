const offscreenVideos = new Map<string, Promise<HTMLVideoElement>>()
const frameCache = new Map<string, string>()

function loadOffscreenVideo(src: string): Promise<HTMLVideoElement> {
  let pending = offscreenVideos.get(src)
  if (pending) return pending

  const video = document.createElement("video")
  video.src = src
  video.muted = true
  video.playsInline = true
  video.preload = "auto"

  pending = new Promise((resolve, reject) => {
    video.addEventListener("loadeddata", () => resolve(video), { once: true })
    video.addEventListener("error", () => reject(new Error(`failed to load ${src}`)), { once: true })
  })
  offscreenVideos.set(src, pending)
  return pending
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise(resolve => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked)
      resolve()
    }
    video.addEventListener("seeked", onSeeked)
    video.currentTime = time
  })
}

/** Grabs a JPEG data URL of the frame at `time` seconds into `src`. Cached per (src, time). */
export async function captureFrame(src: string, time: number): Promise<string> {
  const key = `${src}@${time.toFixed(2)}`
  const cached = frameCache.get(key)
  if (cached) return cached

  const video = await loadOffscreenVideo(src)
  await seekTo(video, time)

  const canvas = document.createElement("canvas")
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(video, 0, 0)
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82)
  frameCache.set(key, dataUrl)
  return dataUrl
}

/** Average RGB of the frame at `time` seconds, for ambient-glow effects. */
export async function captureAmbientColor(src: string, time: number): Promise<string> {
  const video = await loadOffscreenVideo(src)
  await seekTo(video, time)

  const canvas = document.createElement("canvas")
  canvas.width = 16
  canvas.height = 16
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(video, 0, 0, 16, 16)
  const { data } = ctx.getImageData(0, 0, 16, 16)

  let r = 0, g = 0, b = 0
  const pixelCount = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  return `rgb(${Math.round(r / pixelCount)}, ${Math.round(g / pixelCount)}, ${Math.round(b / pixelCount)})`
}
