import { createActor } from "xstate"
import { appMachine, saveProgress } from "./appMachine"
import { DECKS } from "./data/decks"
import { precomputeDeckOptions } from "./utils/deckUtils"
import { inspect } from "./xstateInspector"

type AppActor = ReturnType<typeof createAppActor>

function createAppActor() {
  const actor = createActor(appMachine, {
    input: { decks: DECKS, precomputeDeckOptions },
    inspect,
  })
  actor.start()

  let lastSavedProgress = ""
  actor.subscribe(snapshot => {
    const serialized = JSON.stringify(snapshot.context.progress)
    if (serialized !== lastSavedProgress) {
      lastSavedProgress = serialized
      saveProgress(snapshot.context.progress)
    }
  })

  return actor
}

export let appActor: AppActor = createAppActor()

export function getAppSnapshot() {
  return appActor.getSnapshot()
}

export function restartAppActor() {
  appActor.stop()
  appActor = createAppActor()
}
