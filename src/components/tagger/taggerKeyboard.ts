export type TaggerKeyTarget = "json-editor" | "other-typing" | "default"

export type TaggerKeyDownAction =
  | { type: "undo" }
  | { type: "redo" }
  | { type: "scrub"; deltaSec: number }
  | { type: "delete-marker" }
  | { type: "toggle-playback" }
  | { type: "ignore" }

type KeyLike = {
  code: string
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}

export function taggerKeyTarget(
  el: EventTarget | null,
  jsonEditor: HTMLElement | null,
): TaggerKeyTarget {
  if (!el || typeof el !== "object") return "default"
  const node = el as HTMLElement
  if (typeof node.tagName !== "string") return "default"
  if (jsonEditor && node === jsonEditor) return "json-editor"
  if (node.tagName === "TEXTAREA" || node.tagName === "INPUT" || node.isContentEditable) {
    return "other-typing"
  }
  return "default"
}

export function isTaggerUndoKey(e: KeyLike): boolean {
  return (
    (e.ctrlKey || e.metaKey) &&
    !e.shiftKey &&
    (e.code === "KeyZ" || e.key === "z" || e.key === "Z")
  )
}

export function isTaggerRedoKey(e: KeyLike): boolean {
  return (
    (e.ctrlKey || e.metaKey) &&
    (e.code === "KeyY" ||
      e.key === "y" ||
      e.key === "Y" ||
      ((e.code === "KeyZ" || e.key === "z" || e.key === "Z") && e.shiftKey))
  )
}

export function taggerKeyDownAction(input: {
  target: TaggerKeyTarget
  code: string
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  nudgeSec: number
  jsonPastLength: number
  jsonFutureLength: number
}): TaggerKeyDownAction {
  const keyLike: KeyLike = input

  if (isTaggerUndoKey(keyLike)) {
    if (input.target === "json-editor" && input.jsonPastLength === 0) return { type: "ignore" }
    return { type: "undo" }
  }
  if (isTaggerRedoKey(keyLike)) {
    if (input.target === "json-editor" && input.jsonFutureLength === 0) return { type: "ignore" }
    return { type: "redo" }
  }
  if (input.target === "json-editor" || input.target === "other-typing") return { type: "ignore" }

  const arrowDelta =
    input.code === "ArrowLeft" || input.key === "ArrowLeft"
      ? -input.nudgeSec
      : input.code === "ArrowRight" || input.key === "ArrowRight"
        ? input.nudgeSec
        : null

  if (arrowDelta !== null) return { type: "scrub", deltaSec: arrowDelta }
  if (input.code === "Delete" || input.key === "Delete") return { type: "delete-marker" }
  if (input.code === "Backspace" || input.key === "Backspace") return { type: "delete-marker" }
  if (input.code === "Space" || input.key === " ") return { type: "toggle-playback" }
  return { type: "ignore" }
}

export function taggerKeyUpShouldSuppress(
  target: TaggerKeyTarget,
  code: string,
  key: string,
): boolean {
  if (target === "json-editor" || target === "other-typing") return false
  const isSpace = code === "Space" || key === " "
  const isArrow =
    code === "ArrowLeft" ||
    code === "ArrowRight" ||
    key === "ArrowLeft" ||
    key === "ArrowRight"
  return isSpace || isArrow
}
