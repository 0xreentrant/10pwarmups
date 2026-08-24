export type TrainBusEvent =
  | {
      type: "ask"
      moveIdx: number
      beat: number
      correctOptionIndex: number
      options: string[]
      moveText: string
    }
  | {
      type: "phase"
      from: string
      to: string
      moveIdx: number
      picked: number | null
      beat: number
    }
  | {
      type: "done"
      moveIdx: number
      total: number
      streak: number
    }
  | {
      type: "log"
      label: string
      detail?: Record<string, unknown>
    }

type TrainListener = (event: TrainBusEvent) => void

const listeners = new Set<TrainListener>()
const recent: TrainBusEvent[] = []
const RECENT_CAP = 40

function enabled() {
  return import.meta.env.DEV && !import.meta.env.VITEST
}

export function publishTrain(event: TrainBusEvent) {
  if (!enabled()) return
  recent.push(event)
  if (recent.length > RECENT_CAP) recent.shift()
  for (const listener of listeners) listener(event)
  if (event.type === "log") {
    if (event.detail && Object.keys(event.detail).length > 0) {
      console.log(`[train] ${event.label}`, event.detail)
    } else {
      console.log(`[train] ${event.label}`)
    }
    return
  }
  console.log(`[train] ${event.type}`, event)
}

export function subscribeTrain(listener: TrainListener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function logTrainMode(label: string, detail?: Record<string, unknown>) {
  publishTrain({ type: "log", label, detail })
}

declare global {
  interface Window {
    __trainBus?: {
      subscribe: typeof subscribeTrain
      publish: typeof publishTrain
      recent: () => TrainBusEvent[]
    }
  }
}

if (enabled() && typeof window !== "undefined") {
  window.__trainBus = {
    subscribe: subscribeTrain,
    publish: publishTrain,
    recent: () => [...recent],
  }
}
