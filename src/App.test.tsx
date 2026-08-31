import { describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { DECKS, SERIES } from './data/decks'
import { APP_RELEASE_VERSION, WHATS_NEW_STORAGE_KEY } from './data/whatsNew'
import { SCHEDULE_ONBOARDING_STORAGE_KEY, SCHEDULE_ONBOARDING_VERSION } from './data/scheduleOnboarding'
import { restartAppActor } from './appActor'
import { renderWithRouter } from './test/renderWithRouter'
import {
  answerDeckMoves,
  clickOptionWithText,
  clickWrongOption,
  getOptionButtons,
  HOME_SERIES_A,
  startFirstDeck,
} from './test/trainingHelpers'

const A1_MOVES = DECKS.find(d => d.id === 'A1')!.moves.map(m => m.text)

async function confirmLeaveTest() {
  await screen.findByText("10th Planet")
}

describe('Acceptance flows', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(WHATS_NEW_STORAGE_KEY, APP_RELEASE_VERSION)
    localStorage.setItem(SCHEDULE_ONBOARDING_STORAGE_KEY, SCHEDULE_ONBOARDING_VERSION)
    restartAppActor()
  })

  it('shows home with brand and week schedule', async () => {
    await renderWithRouter(HOME_SERIES_A)
    expect(screen.getByText('10th Planet')).toBeInTheDocument()
    expect(screen.getByText('Warmup Trainer')).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`${SERIES.length} series · Week \\d+ of 8`))).toBeInTheDocument()
  })

  it('starts training with four options including the first move', async () => {
    await renderWithRouter(HOME_SERIES_A)
    await startFirstDeck()

    expect(document.querySelector('.bl-overlay')).toBeTruthy()
    expect(getOptionButtons().length).toBe(4)
    expect(screen.getByRole('button', { name: new RegExp(A1_MOVES[0], 'i') })).toBeInTheDocument()
  })

  it('completes a short deck with a perfect result', async () => {
    await renderWithRouter(HOME_SERIES_A)
    await startFirstDeck()
    await answerDeckMoves(A1_MOVES)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 }).textContent).toMatch(/Perfect/)
    }, { timeout: 15000 })
  }, 60000)

  it('shows loaded progress on the series home', async () => {
    localStorage.setItem('tp_progress', JSON.stringify({
      A1: {
        bestStreak: 3,
        lastAttemptDate: '2026-06-05',
        attempts: [{ date: '2026-06-05', finalStreak: 3, wrongMoves: [], duration: 120 }],
      },
    }))
    restartAppActor()

    await renderWithRouter(HOME_SERIES_A)
    expect(screen.getByText(/3\/5/)).toBeInTheDocument()
  })

  it('records wrong moves and final streak on a non-perfect completion', async () => {
    await renderWithRouter(HOME_SERIES_A)
    await startFirstDeck()

    const answerSequence = [true, false, true, true, true]
    for (let i = 0; i < answerSequence.length; i++) {
      if (answerSequence[i]) {
        await clickOptionWithText(A1_MOVES[i])
      } else {
        await clickWrongOption(A1_MOVES[i])
      }
    }

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 }).textContent).toMatch(/Complete/)
      expect(screen.getByText(/streak 3/)).toBeInTheDocument()
    }, { timeout: 15000 })

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('tp_progress')!)
      expect(saved['A1'].attempts[0].wrongMoves).toContain(1)
      expect(saved['A1'].attempts[0].finalStreak).toBe(3)
    }, { timeout: 3000 })
  }, 60000)

  it('discards incomplete attempts when the user abandons training', async () => {
    await renderWithRouter(HOME_SERIES_A)
    await startFirstDeck()
    await clickOptionWithText(A1_MOVES[0])

    fireEvent.click(screen.getByRole('button', { name: 'Exit training' }))
    await confirmLeaveTest()

    const saved = JSON.parse(localStorage.getItem('tp_progress')!)
    expect(saved['A1'].attempts).toHaveLength(0)
  })

  it('requires confirmation before resetting all progress', async () => {
    localStorage.setItem('tp_progress', JSON.stringify({
      A1: { bestStreak: 5, attempts: [{ date: '2026-06-05' }] },
    }))
    restartAppActor()

    await renderWithRouter(HOME_SERIES_A)
    fireEvent.click(screen.getByText('Stats'))
    await screen.findByText('All Decks')

    fireEvent.click(screen.getByText('Reset all'))
    expect(screen.getByText('Confirm reset')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.getByText('Reset all')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Reset all'))
    fireEvent.click(screen.getByText('Confirm reset'))

    const saved = JSON.parse(localStorage.getItem('tp_progress')!)
    expect(saved['A1'].bestStreak).toBe(0)
    expect(saved['A1'].attempts.length).toBe(0)
  })
})
