import { useEffect } from "react"
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useRouter,
} from "@tanstack/react-router"
import { useSelector } from "@xstate/react"
import ExitConfirmPopover from "./components/ExitConfirmPopover"
import CompletionScreen from "./components/CompletionScreen"
import HomeScreen from "./components/HomeScreen"
import ProgressScreen from "./components/ProgressScreen"
import TrainingScreen from "./components/TrainingScreen"
import WhatsNewPopover from "./components/WhatsNewPopover"
import { appActor, getAppSnapshot } from "./appActor"
import { hasRestorableCompletion } from "./appMachine"
import { DECKS } from "./data/decks"
import { useWhatsNew } from "./hooks/useWhatsNew"
import { consumePopNavigation, trackRouterHistoryActions } from "./navigationHistory"
import { homeSectionHash, nextDeckId } from "./utils/deckUtils"

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    const snap = getAppSnapshot()
    if (
      snap.value === "training" &&
      snap.context.currentDeckId &&
      snap.context.session &&
      !snap.context.session.locked
    ) {
      if (!snap.context.exitConfirm) {
        appActor.send({ type: "REQUEST_EXIT" })
      }
      throw redirect({ to: "/$deckId/training", params: { deckId: snap.context.currentDeckId } })
    }
  },
  component: HomeRoute,
})

const allProgressRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/progress",
  component: AllProgressRoute,
})

const deckRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/$deckId",
  beforeLoad: ({ params }) => {
    if (!DECKS.some(d => d.id === params.deckId)) {
      throw redirect({ to: "/" })
    }
  },
})

const deckIndexRoute = createRoute({
  getParentRoute: () => deckRoute,
  path: "/",
  component: DeckProgressRoute,
})

const trainingRoute = createRoute({
  getParentRoute: () => deckRoute,
  path: "/training",
  beforeLoad: ({ params }) => {
    const snap = getAppSnapshot()
    if (snap.value !== "training" || snap.context.currentDeckId !== params.deckId) {
      throw redirect({ to: "/$deckId", params: { deckId: params.deckId } })
    }
  },
  component: TrainingRoute,
})

const completedRoute = createRoute({
  getParentRoute: () => deckRoute,
  path: "/completed",
  beforeLoad: ({ params }) => {
    const snap = getAppSnapshot()
    const deckId = params.deckId
    if (snap.value === "completed" && snap.context.currentDeckId === deckId) {
      return
    }
    if (hasRestorableCompletion(snap, deckId)) {
      if (consumePopNavigation()) {
        appActor.send({ type: "RESTORE_COMPLETED" })
        return
      }
      throw redirect({ to: "/" })
    }
    if (
      snap.value === "training" &&
      snap.context.currentDeckId === deckId &&
      snap.context.session &&
      !snap.context.session.locked
    ) {
      throw redirect({ to: "/$deckId/training", params: { deckId } })
    }
    throw redirect({ to: "/" })
  },
  component: CompletedRoute,
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  allProgressRoute,
  deckRoute.addChildren([
    deckIndexRoute,
    trainingRoute,
    completedRoute,
  ]),
])

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

function RootLayout() {
  const routerInstance = useRouter()
  const { open: whatsNewOpen, dismiss: dismissWhatsNew } = useWhatsNew()

  useEffect(() => {
    return trackRouterHistoryActions(routerInstance.history)
  }, [routerInstance])

  useEffect(() => {
    return routerInstance.history.block({
      blockerFn: ({ action, nextLocation }) => {
        const snap = getAppSnapshot()
        const activeTrainingPath = snap.context.currentDeckId
          ? `/${snap.context.currentDeckId}/training`
          : null
        const leavingActiveTraining =
          snap.value === "training" &&
          !!snap.context.session &&
          !snap.context.session.locked &&
          (action === "BACK" || nextLocation.pathname !== activeTrainingPath)

        if (!leavingActiveTraining) return false
        if (!snap.context.exitConfirm) {
          appActor.send({ type: "REQUEST_EXIT" })
        }
        return true
      },
      enableBeforeUnload: false,
    })
  }, [routerInstance])

  useEffect(() => {
    return routerInstance.subscribe("onResolved", () => {
      const path = routerInstance.state.location.pathname
      const snap = getAppSnapshot()
      if (path === "/" && snap.value === "completed") {
        appActor.send({ type: "GO_HOME" })
      }
    })
  }, [routerInstance])

  return (
    <div className="mx-auto max-w-[480px] px-4">
      <Outlet />
      <div className="mb-4 text-muted">
        (c) 0xreentrant 2026 · <a href="updates.html" className="text-muted no-underline">Latest Updates</a>
      </div>
      <WhatsNewPopover open={whatsNewOpen} onDismiss={dismissWhatsNew} />
    </div>
  )
}

function HomeRoute() {
  const routerInstance = useRouter()
  const progress = useSelector(appActor, s => s.context.progress)
  const resetConfirm = useSelector(appActor, s => s.context.resetConfirm)
  const scrollToSectionId = routerInstance.state.location.hash || undefined

  return (
    <HomeScreen
      scrollToSectionId={scrollToSectionId}
      progress={progress}
      onDeckClick={deckId => {
        appActor.send({ type: "START_DECK", deckId })
        routerInstance.navigate({ to: "/$deckId/training", params: { deckId } })
      }}
      onStats={() => routerInstance.navigate({ to: "/progress" })}
      onReset={() => appActor.send({ type: "RESET" })}
      resetConfirm={resetConfirm}
      onCancelReset={() => appActor.send({ type: "CANCEL_RESET" })}
    />
  )
}

function TrainingRoute() {
  const routerInstance = useRouter()
  const { deckId } = trainingRoute.useParams()
  const deck = DECKS.find(d => d.id === deckId)!
  const session = useSelector(appActor, s => s.context.session)!
  const exitConfirm = useSelector(appActor, s => s.context.exitConfirm)

  useEffect(() => {
    const sub = appActor.subscribe(snapshot => {
      if (snapshot.value === "completed" && snapshot.context.currentDeckId === deckId) {
        routerInstance.navigate({ to: "/$deckId/completed", params: { deckId }, replace: true })
      }
    })
    return () => sub.unsubscribe()
  }, [deckId, routerInstance])

  return (
    <>
      <TrainingScreen
        deck={deck}
        session={session}
        onOptionClick={optionIndex => appActor.send({ type: "OPTION_CLICK", optionIndex })}
        onBack={() => appActor.send({ type: "REQUEST_EXIT" })}
      />
      <ExitConfirmPopover
        open={exitConfirm}
        onConfirm={() => {
          appActor.send({ type: "CONFIRM_EXIT" })
          routerInstance.navigate({ to: "/", ignoreBlocker: true })
        }}
        onCancel={() => appActor.send({ type: "CANCEL_EXIT" })}
      />
    </>
  )
}

function CompletedRoute() {
  const routerInstance = useRouter()
  const { deckId } = completedRoute.useParams()
  const deck = DECKS.find(d => d.id === deckId)!
  const progress = useSelector(appActor, s => s.context.progress)
  const session = useSelector(appActor, s => s.context.session)!

  return (
    <CompletionScreen
      deck={deck}
      session={session}
      progress={progress}
      onNext={() => {
        const nid = nextDeckId(deck.id)
        if (nid) {
          appActor.send({ type: "START_DECK", deckId: nid })
          routerInstance.navigate({ to: "/$deckId/training", params: { deckId: nid } })
        } else {
          appActor.send({ type: "GO_HOME" })
          routerInstance.navigate({ to: "/" })
        }
      }}
      onHome={() => {
        appActor.send({ type: "GO_HOME" })
        routerInstance.navigate({ to: "/", hash: homeSectionHash(deck), hashScrollIntoView: false })
      }}
      onTryAgain={() => {
        appActor.send({ type: "START_DECK", deckId: deck.id })
        routerInstance.navigate({ to: "/$deckId/training", params: { deckId: deck.id } })
      }}
      onStats={() => routerInstance.navigate({ to: "/$deckId", params: { deckId } })}
    />
  )
}

function AllProgressRoute() {
  const routerInstance = useRouter()
  const progress = useSelector(appActor, s => s.context.progress)

  return (
    <ProgressScreen
      deckId={null}
      progress={progress}
      onBack={() => routerInstance.history.back()}
      onDeckSelect={id => {
        if (id) routerInstance.navigate({ to: "/$deckId", params: { deckId: id } })
      }}
    />
  )
}

function DeckProgressRoute() {
  const routerInstance = useRouter()
  const { deckId } = deckRoute.useParams()
  const progress = useSelector(appActor, s => s.context.progress)

  return (
    <ProgressScreen
      deckId={deckId}
      progress={progress}
      onBack={() => routerInstance.history.back()}
      onDeckSelect={id => {
        if (id) routerInstance.navigate({ to: "/$deckId", params: { deckId: id } })
        else routerInstance.navigate({ to: "/progress" })
      }}
    />
  )
}
