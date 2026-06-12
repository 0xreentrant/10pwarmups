import CompletionScreen from "./components/CompletionScreen"
import HomeScreen from "./components/HomeScreen"
import ProgressScreen from "./components/ProgressScreen"
import TrainingScreen from "./components/TrainingScreen"
import WhatsNewPopover from "./components/WhatsNewPopover"
import { DECKS } from "./data/decks"
import { useWhatsNew } from "./hooks/useWhatsNew"
import { useAppState } from "./useAppState"
import { nextDeckId, precomputeDeckOptions } from "./utils/deckUtils"

export default function App() {
  const { open: whatsNewOpen, dismiss: dismissWhatsNew } = useWhatsNew()
  const {
    view,
    progress,
    session,
    statsForDeck,
    resetConfirm,
    deck,
    startDeck,
    goHome,
    goBack,
    openStats,
    handleReset,
    handleOptionClick,
    handleBackHome,
    cancelReset,
    setStatsForDeck,
  } = useAppState(DECKS, precomputeDeckOptions)

  return (
    <div className="mx-auto max-w-[480px] px-4">
      {view === "home" && (
        <HomeScreen
          progress={progress}
          onDeckClick={startDeck}
          onStats={() => openStats()}
          onReset={handleReset}
          resetConfirm={resetConfirm}
          onCancelReset={cancelReset}
        />
      )}
      {view === "training" && deck && session && (
        <TrainingScreen
          deck={deck}
          session={session}
          onOptionClick={handleOptionClick}
          onBack={handleBackHome}
        />
      )}
      {view === "completion" && deck && session && (
        <CompletionScreen
          deck={deck}
          session={session}
          progress={progress}
          onNext={() => { const nid = nextDeckId(deck.id); if (nid) startDeck(nid); else goHome() }}
          onHome={goHome}
          onTryAgain={() => startDeck(deck.id)}
          onStats={() => openStats(deck.id)}
        />
      )}
      {view === "progress" && (
        <ProgressScreen
          deckId={statsForDeck}
          progress={progress}
          onBack={goBack}
          onDeckSelect={setStatsForDeck}
        />
      )}
      <div className="mb-4 text-muted">
        (c) 0xreentrant 2026 · <a href="updates.html" className="text-muted no-underline">Latest Updates</a>
      </div>
      <WhatsNewPopover open={whatsNewOpen} onDismiss={dismissWhatsNew} />
    </div>
  )
}
