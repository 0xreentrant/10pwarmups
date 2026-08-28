import { useEffect } from "react"
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useRouter,
  useRouterState,
} from "@tanstack/react-router"
import { useSelector } from "@xstate/react"
import ScheduleHomeScreen from "./components/ScheduleHomeScreen"
import BetaTestScreen from "./components/BetaTestScreen"
import CompletionScreen from "./components/CompletionScreen"
import ProgressScreen from "./components/ProgressScreen"
import TaggerView, { type TaggerTab } from "./components/tagger/TaggerView"
import TrainingScreen from "./components/TrainingScreen"
import CinemaReviewView from "./components/training/CinemaReviewView"
import TrainingSessionView from "./components/training/TrainingSessionView"
import WhatsNewPopover from "./components/WhatsNewPopover"
import { appActor, getAppSnapshot } from "./appActor"
import { hasRestorableCompletion } from "./appMachine"
import { DECKS } from "./data/decks"
import type { SeriesId } from "./data/warmupSchedule"
import { useWhatsNew } from "./hooks/useWhatsNew"
import { consumePopNavigation, trackRouterHistoryActions } from "./navigationHistory"
import { nextDeckId } from "./utils/deckUtils"
import {
  clearMenuReturn,
  consumeAllScrollY,
  rememberAllMenuReturn,
  sessionHomePathForDeck,
  sessionHomePathForDeckId,
} from "./utils/menuReturn"
import { defaultWeekSeriesLetter, isSeriesLetter } from "./utils/seriesRoute"
import { listVideoDeckIds } from "./utils/deckVideo"

const TAGGER_MODES: readonly TaggerTab[] = ["edit", "train", "review"]

function isTaggerMode(mode: string): mode is TaggerTab {
  return (TAGGER_MODES as readonly string[]).includes(mode)
}

function defaultTaggerWarmup(): string {
  return listVideoDeckIds()[0] ?? ""
}

function isValidWarmup(warmup: string): boolean {
  return DECKS.some(d => d.id === warmup)
}

function trainingPathMatches(path: string, deckId: string): boolean {
  return path === `/${deckId}/training` || path === `/beta-test/${deckId}/train`
}

function reviewPathMatches(path: string, deckId: string): boolean {
  return path === `/${deckId}/review` || path === `/beta-test/${deckId}/review`
}

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    const letter = defaultWeekSeriesLetter()
    if (letter) {
      throw redirect({ to: "/series/$letter", params: { letter } })
    }
  },
  component: HomeRoute,
})

const seriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/series/$letter",
  beforeLoad: ({ params }) => {
    if (!isSeriesLetter(params.letter)) {
      throw redirect({ to: "/" })
    }
  },
  component: SeriesHomeRoute,
})

const allDecksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/all",
  component: AllDecksHomeRoute,
})

const allProgressRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/progress",
  component: AllProgressRoute,
})

const betaTestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/beta-test/$warmup",
  beforeLoad: ({ params }) => {
    if (!isValidWarmup(params.warmup)) {
      throw redirect({ to: "/" })
    }
  },
})

const betaTestIndexRoute = createRoute({
  getParentRoute: () => betaTestRoute,
  path: "/",
  component: BetaTestLandingRoute,
})

const betaTestTrainRoute = createRoute({
  getParentRoute: () => betaTestRoute,
  path: "/train",
  beforeLoad: ({ params }) => {
    const snap = getAppSnapshot()
    if (snap.value !== "training" || snap.context.currentDeckId !== params.warmup) {
      throw redirect({ to: "/beta-test/$warmup", params: { warmup: params.warmup } })
    }
  },
  component: BetaTestTrainingRoute,
})

const betaTestReviewRoute = createRoute({
  getParentRoute: () => betaTestRoute,
  path: "/review",
  beforeLoad: ({ params }) => {
    const snap = getAppSnapshot()
    if (snap.value !== "review" || snap.context.currentDeckId !== params.warmup) {
      throw redirect({ to: "/beta-test/$warmup", params: { warmup: params.warmup } })
    }
  },
  component: BetaTestReviewRoute,
})

const betaTestCompletedRoute = createRoute({
  getParentRoute: () => betaTestRoute,
  path: "/completed",
  beforeLoad: ({ params }) => {
    const snap = getAppSnapshot()
    const warmup = params.warmup
    if (snap.value === "completed" && snap.context.currentDeckId === warmup) {
      return
    }
    if (hasRestorableCompletion(snap, warmup)) {
      if (consumePopNavigation()) {
        appActor.send({ type: "RESTORE_COMPLETED" })
        return
      }
      throw redirect({ to: "/beta-test/$warmup", params: { warmup } })
    }
    if (
      snap.value === "training" &&
      snap.context.currentDeckId === warmup &&
      snap.context.session &&
      !snap.context.session.locked
    ) {
      throw redirect({ to: "/beta-test/$warmup/train", params: { warmup } })
    }
    throw redirect({ to: "/beta-test/$warmup", params: { warmup } })
  },
  component: BetaTestCompletedRoute,
})

const taggerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tagger",
})

const taggerIndexRoute = createRoute({
  getParentRoute: () => taggerRoute,
  path: "/",
  beforeLoad: () => {
    const warmup = defaultTaggerWarmup()
    if (!warmup) throw redirect({ to: "/" })
    throw redirect({ to: "/tagger/$warmup/$mode", params: { warmup, mode: "edit" } })
  },
})

const taggerWarmupRoute = createRoute({
  getParentRoute: () => taggerRoute,
  path: "/$warmup",
  beforeLoad: ({ params }) => {
    if (!listVideoDeckIds().includes(params.warmup)) {
      throw redirect({ to: "/tagger" })
    }
  },
})

const taggerWarmupIndexRoute = createRoute({
  getParentRoute: () => taggerWarmupRoute,
  path: "/",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/tagger/$warmup/$mode",
      params: { warmup: params.warmup, mode: "edit" },
    })
  },
})

const taggerModeRoute = createRoute({
  getParentRoute: () => taggerWarmupRoute,
  path: "/$mode",
  beforeLoad: ({ params }) => {
    if (!isTaggerMode(params.mode)) {
      throw redirect({
        to: "/tagger/$warmup/$mode",
        params: { warmup: params.warmup, mode: "edit" },
      })
    }
  },
  component: TaggerRoute,
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

const reviewRoute = createRoute({
  getParentRoute: () => deckRoute,
  path: "/review",
  beforeLoad: ({ params }) => {
    const snap = getAppSnapshot()
    if (snap.value !== "review" || snap.context.currentDeckId !== params.deckId) {
      throw redirect({ to: "/$deckId", params: { deckId: params.deckId } })
    }
  },
  component: ReviewRoute,
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
  seriesRoute,
  allDecksRoute,
  allProgressRoute,
  betaTestRoute.addChildren([
    betaTestIndexRoute,
    betaTestTrainRoute,
    betaTestReviewRoute,
    betaTestCompletedRoute,
  ]),
  taggerRoute.addChildren([
    taggerIndexRoute,
    taggerWarmupRoute.addChildren([taggerWarmupIndexRoute, taggerModeRoute]),
  ]),
  deckRoute.addChildren([
    deckIndexRoute,
    trainingRoute,
    reviewRoute,
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
  const pathname = useRouterState({ select: s => s.location.pathname })
  const onBetaTest = pathname.startsWith("/beta-test")
  const { open: whatsNewOpen, dismiss: dismissWhatsNew } = useWhatsNew()

  useEffect(() => {
    return trackRouterHistoryActions(routerInstance.history)
  }, [routerInstance])

  useEffect(() => {
    return routerInstance.subscribe("onResolved", () => {
      const path = routerInstance.state.location.pathname
      const snap = getAppSnapshot()
      if (
        snap.value === "training" &&
        snap.context.currentDeckId &&
        snap.context.session &&
        !snap.context.session.locked
      ) {
        const deckId = snap.context.currentDeckId
        if (!trainingPathMatches(path, deckId)) {
          appActor.send({ type: "REQUEST_EXIT" })
          return
        }
      }
      if (snap.value === "review" && snap.context.currentDeckId) {
        const deckId = snap.context.currentDeckId
        if (!reviewPathMatches(path, deckId)) {
          appActor.send({ type: "REQUEST_EXIT" })
          return
        }
      }
      if (path === "/" && snap.value === "completed") {
        appActor.send({ type: "GO_HOME" })
      }
    })
  }, [routerInstance])

  return (
    <div className="mx-auto max-w-[520px] px-4">
      <Outlet />
      <div className="mb-4 text-muted">
        (c) 0xreentrant 2026 · <a href="updates.html" className="text-muted no-underline">Latest Updates</a>
      </div>
      <WhatsNewPopover open={whatsNewOpen && !onBetaTest} onDismiss={dismissWhatsNew} />
    </div>
  )
}

function useScheduleHomeHandlers() {
  const routerInstance = useRouter()
  const progress = useSelector(appActor, s => s.context.progress)

  return {
    progress,
    scrollToSectionId: routerInstance.state.location.hash || undefined,
    onDeckClick: (deckId: string) => {
      const fromPath = routerInstance.state.location.pathname
      if (fromPath === "/all") rememberAllMenuReturn(window.scrollY)
      else clearMenuReturn()
      appActor.send({ type: "START_DECK", deckId })
      routerInstance.navigate({ to: "/$deckId/training", params: { deckId } })
    },
    onReviewClick: (deckId: string) => {
      const fromPath = routerInstance.state.location.pathname
      if (fromPath === "/all") rememberAllMenuReturn(window.scrollY)
      else clearMenuReturn()
      appActor.send({ type: "START_REVIEW", deckId })
      routerInstance.navigate({ to: "/$deckId/review", params: { deckId } })
    },
    onStats: () => routerInstance.navigate({ to: "/progress" }),
    onSeriesSelect: (letter: string) => {
      clearMenuReturn()
      routerInstance.navigate({ to: "/series/$letter", params: { letter } })
    },
    onAllSelect: () => routerInstance.navigate({ to: "/all" }),
    onWeekSchedule: () => {
      clearMenuReturn()
      const letter = defaultWeekSeriesLetter()
      if (letter) {
        routerInstance.navigate({ to: "/series/$letter", params: { letter } })
      } else {
        routerInstance.navigate({ to: "/" })
      }
    },
  }
}

function HomeRoute() {
  const handlers = useScheduleHomeHandlers()

  return (
    <ScheduleHomeScreen
      view="week"
      seriesLetter={null}
      {...handlers}
    />
  )
}

function SeriesHomeRoute() {
  const { letter } = seriesRoute.useParams()
  const handlers = useScheduleHomeHandlers()

  return (
    <ScheduleHomeScreen
      view="week"
      seriesLetter={letter as SeriesId}
      {...handlers}
    />
  )
}

function AllDecksHomeRoute() {
  const handlers = useScheduleHomeHandlers()
  useEffect(() => {
    const savedY = consumeAllScrollY()
    if (savedY != null) {
      requestAnimationFrame(() => window.scrollTo(0, savedY))
    }
  }, [])

  return (
    <ScheduleHomeScreen
      view="all"
      seriesLetter={null}
      {...handlers}
    />
  )
}

function BetaTestLandingRoute() {
  const routerInstance = useRouter()
  const { warmup } = betaTestRoute.useParams()
  const deck = DECKS.find(d => d.id === warmup)!
  const progress = useSelector(appActor, s => s.context.progress)

  return (
    <BetaTestScreen
      deck={deck}
      progress={progress}
      onDeckClick={deckId => {
        appActor.send({ type: "START_DECK", deckId })
        routerInstance.navigate({ to: "/beta-test/$warmup/train", params: { warmup: deckId } })
      }}
      onReviewClick={deckId => {
        appActor.send({ type: "START_REVIEW", deckId })
        routerInstance.navigate({ to: "/beta-test/$warmup/review", params: { warmup: deckId } })
      }}
      onHome={() => routerInstance.navigate({ to: "/" })}
    />
  )
}

function betaSessionHandlers(
  routerInstance: ReturnType<typeof useRouter>,
  deck: (typeof DECKS)[number],
  warmup: string,
) {
  return {
    onExit: () => {
      appActor.send({ type: "REQUEST_EXIT" })
      routerInstance.navigate({ to: "/beta-test/$warmup", params: { warmup } })
    },
    onSwitchToReview: () => {
      appActor.send({ type: "START_REVIEW", deckId: warmup })
      routerInstance.navigate({ to: "/beta-test/$warmup/review", params: { warmup } })
    },
    onRestart: () => {
      appActor.send({ type: "START_DECK", deckId: warmup })
      routerInstance.navigate({ to: "/beta-test/$warmup/train", params: { warmup } })
    },
    onTryAgain: () => {
      appActor.send({ type: "START_DECK", deckId: deck.id })
      routerInstance.navigate({ to: "/beta-test/$warmup/train", params: { warmup: deck.id } })
    },
    onNext: () => {
      appActor.send({ type: "GO_HOME" })
      routerInstance.navigate({ to: "/beta-test/$warmup", params: { warmup } })
    },
    onHome: () => {
      appActor.send({ type: "GO_HOME" })
      routerInstance.navigate({ to: "/beta-test/$warmup", params: { warmup } })
    },
    onStats: () => routerInstance.navigate({ to: "/$deckId", params: { deckId: warmup } }),
  }
}

function TrainingRoute() {
  const routerInstance = useRouter()
  const { deckId } = trainingRoute.useParams()
  const deck = DECKS.find(d => d.id === deckId)!
  const session = useSelector(appActor, s => s.context.session)!

  useEffect(() => {
    const sub = appActor.subscribe(snapshot => {
      if (snapshot.value === "completed" && snapshot.context.currentDeckId === deckId) {
        routerInstance.navigate({ to: "/$deckId/completed", params: { deckId }, replace: true })
      }
    })
    return () => sub.unsubscribe()
  }, [deckId, routerInstance])

  return (
    <TrainingScreen
      deck={deck}
      mode="training"
      session={session}
      onOptionClick={optionIndex => appActor.send({ type: "OPTION_CLICK", optionIndex })}
      onBack={() => {
        appActor.send({ type: "REQUEST_EXIT" })
        routerInstance.navigate(sessionHomePathForDeckId(deckId))
      }}
      onSwitchToReview={() => {
        appActor.send({ type: "START_REVIEW", deckId })
        routerInstance.navigate({ to: "/$deckId/review", params: { deckId } })
      }}
      onSwitchToTrain={() => {}}
    />
  )
}

function ReviewRoute() {
  const routerInstance = useRouter()
  const { deckId } = reviewRoute.useParams()
  const deck = DECKS.find(d => d.id === deckId)!

  return (
    <TrainingScreen
      deck={deck}
      mode="review"
      session={null}
      onOptionClick={() => {}}
      onBack={() => {
        appActor.send({ type: "REQUEST_EXIT" })
        routerInstance.navigate(sessionHomePathForDeckId(deckId))
      }}
      onSwitchToReview={() => {}}
      onSwitchToTrain={() => {
        appActor.send({ type: "START_DECK", deckId })
        routerInstance.navigate({ to: "/$deckId/training", params: { deckId } })
      }}
    />
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
          routerInstance.navigate(sessionHomePathForDeckId(deck.id))
        }
      }}
      onHome={() => {
        appActor.send({ type: "GO_HOME" })
        routerInstance.navigate(sessionHomePathForDeck(deck))
      }}
      onTryAgain={() => {
        appActor.send({ type: "START_DECK", deckId: deck.id })
        routerInstance.navigate({ to: "/$deckId/training", params: { deckId: deck.id } })
      }}
      onStats={() => routerInstance.navigate({ to: "/$deckId", params: { deckId } })}
    />
  )
}

function BetaTestTrainingRoute() {
  const routerInstance = useRouter()
  const { warmup } = betaTestTrainRoute.useParams()
  const deck = DECKS.find(d => d.id === warmup)!
  const snap = useSelector(appActor, s => s)
  const handlers = betaSessionHandlers(routerInstance, deck, warmup)

  useEffect(() => {
    const sub = appActor.subscribe(snapshot => {
      if (snapshot.value === "completed" && snapshot.context.currentDeckId === warmup) {
        routerInstance.navigate({
          to: "/beta-test/$warmup/completed",
          params: { warmup },
          replace: true,
        })
      }
    })
    return () => sub.unsubscribe()
  }, [warmup, routerInstance])

  return (
    <TrainingSessionView
      snap={snap}
      send={appActor.send}
      deck={deck}
      tapDemo
      {...handlers}
      onRestart={() => {
        appActor.send({ type: "START_DECK", deckId: warmup })
      }}
    />
  )
}

function BetaTestReviewRoute() {
  const routerInstance = useRouter()
  const { warmup } = betaTestReviewRoute.useParams()
  const deck = DECKS.find(d => d.id === warmup)!

  return (
    <CinemaReviewView
      deck={deck}
      tapDemo
      onBack={() => {
        appActor.send({ type: "REQUEST_EXIT" })
        routerInstance.navigate({ to: "/beta-test/$warmup", params: { warmup } })
      }}
      onSwitchToTrain={() => {
        appActor.send({ type: "START_DECK", deckId: warmup })
        routerInstance.navigate({ to: "/beta-test/$warmup/train", params: { warmup } })
      }}
    />
  )
}

function BetaTestCompletedRoute() {
  const routerInstance = useRouter()
  const { warmup } = betaTestCompletedRoute.useParams()
  const deck = DECKS.find(d => d.id === warmup)!
  const snap = useSelector(appActor, s => s)

  return (
    <TrainingSessionView
      snap={snap}
      send={appActor.send}
      deck={deck}
      {...betaSessionHandlers(routerInstance, deck, warmup)}
    />
  )
}

function AllProgressRoute() {
  const routerInstance = useRouter()
  const progress = useSelector(appActor, s => s.context.progress)
  const resetConfirm = useSelector(appActor, s => s.context.resetConfirm)

  return (
    <ProgressScreen
      deckId={null}
      progress={progress}
      resetConfirm={resetConfirm}
      onBack={() => routerInstance.history.back()}
      onDeckSelect={id => {
        if (id) routerInstance.navigate({ to: "/$deckId", params: { deckId: id } })
      }}
      onReset={() => appActor.send({ type: "RESET" })}
      onCancelReset={() => appActor.send({ type: "CANCEL_RESET" })}
    />
  )
}

function TaggerRoute() {
  const routerInstance = useRouter()
  const { warmup, mode } = taggerModeRoute.useParams()

  return (
    <TaggerView
      warmup={warmup}
      mode={mode as TaggerTab}
      onWarmupChange={nextWarmup => {
        routerInstance.navigate({
          to: "/tagger/$warmup/$mode",
          params: { warmup: nextWarmup, mode },
        })
      }}
      onModeChange={nextMode => {
        routerInstance.navigate({
          to: "/tagger/$warmup/$mode",
          params: { warmup, mode: nextMode },
        })
      }}
    />
  )
}

function DeckProgressRoute() {
  const routerInstance = useRouter()
  const { deckId } = deckRoute.useParams()
  const progress = useSelector(appActor, s => s.context.progress)
  const resetConfirm = useSelector(appActor, s => s.context.resetConfirm)

  return (
    <ProgressScreen
      deckId={deckId}
      progress={progress}
      resetConfirm={resetConfirm}
      onBack={() => routerInstance.history.back()}
      onDeckSelect={id => {
        if (id) routerInstance.navigate({ to: "/$deckId", params: { deckId: id } })
        else routerInstance.navigate({ to: "/progress" })
      }}
      onReset={() => appActor.send({ type: "RESET" })}
      onCancelReset={() => appActor.send({ type: "CANCEL_RESET" })}
    />
  )
}
