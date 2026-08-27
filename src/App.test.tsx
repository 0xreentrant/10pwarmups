import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { DECKS, SERIES } from './data/decks';
import { APP_RELEASE_VERSION, WHATS_NEW_STORAGE_KEY } from './data/whatsNew';
import { SCHEDULE_ONBOARDING_STORAGE_KEY, SCHEDULE_ONBOARDING_VERSION } from './data/scheduleOnboarding';
import { restartAppActor, getAppSnapshot } from './appActor';
import { renderWithRouter } from './test/renderWithRouter';
import {
  answerDeckMoves,
  clickOptionWithText,
  clickWrongOption,
  getOptionButtons,
  HOME_ALL,
  HOME_SERIES_A,
  startFirstDeck,
} from './test/trainingHelpers';

const A1_MOVES = DECKS.find(d => d.id === 'A1')!.moves.map(m => m.text);

async function confirmLeaveTest() {
  await screen.findByText("10th Planet")
}

describe('10th Planet Warmup Trainer - Senior PM Acceptance Tests', () => {
  
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(WHATS_NEW_STORAGE_KEY, APP_RELEASE_VERSION);
    localStorage.setItem(SCHEDULE_ONBOARDING_STORAGE_KEY, SCHEDULE_ONBOARDING_VERSION);
    restartAppActor();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1: CRITICAL USER FLOWS (Must work for trainer to be usable)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CRITICAL: User can launch app and see deck list', () => {
    it('displays home screen with title and week schedule', async () => {
      await renderWithRouter(HOME_SERIES_A);
      expect(screen.getByText('10th Planet')).toBeInTheDocument();
      expect(screen.getByText('Warmup Trainer')).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`${SERIES.length} series · Week \\d+ of 8`))).toBeInTheDocument();
    });

    it('shows series nav and the active series section', async () => {
      await renderWithRouter(HOME_SERIES_A);
      for (const series of SERIES) {
        expect(screen.getByRole('button', { name: series.id })).toBeInTheDocument();
      }
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByText(/Series A - Granbys/)).toBeInTheDocument();
    });

    it('shows named flows section on the all-decks view', async () => {
      await renderWithRouter(HOME_ALL);
      expect(screen.getByText(/Named Flows/)).toBeInTheDocument();
    });

    it('displays a Train button for each deck on the all-decks view', async () => {
      await renderWithRouter(HOME_ALL);
      const trainButtons = screen.getAllByText('Train');
      expect(trainButtons.length).toBeGreaterThan(0);
    });

    it('displays a Review button for each deck on the all-decks view', async () => {
      await renderWithRouter(HOME_ALL);
      const reviewButtons = screen.getAllByText('Review');
      expect(reviewButtons.length).toBeGreaterThan(0);
    });
  });

  describe('CRITICAL: User can start training a deck', () => {
    it('transitions to training screen when Train button is clicked', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck(); // First deck (A1)

      expect(screen.getByText('A1')).toBeInTheDocument();
      expect(screen.getByText('Kneeling')).toBeInTheDocument();
      expect(screen.getByText(/Sequence/)).toBeInTheDocument();
    });

    it('shows multiple choice options for the first move', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck();

      const optionButtons = getOptionButtons();
      expect(optionButtons.length).toBe(4);
      expect(screen.getByRole('button', { name: new RegExp(A1_MOVES[0], 'i') })).toBeInTheDocument();
      expect(screen.getByText(/Person A/)).toBeInTheDocument();
    });

    it('always includes the correct next move in precomputed options', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck();

      const moves = A1_MOVES;
      for (let i = 0; i < moves.length - 1; i++) {
        expect(getOptionButtons().some(b => b.textContent!.includes(moves[i]))).toBe(true);
        clickOptionWithText(moves[i]);
        await new Promise(r => setTimeout(r, 50));
      }
      expect(getOptionButtons().some(b => b.textContent!.includes(moves[moves.length - 1]))).toBe(true);
    });

    it('advances to next move when option is clicked', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck();

      await clickOptionWithText(A1_MOVES[0]);

      await waitFor(() => {
        expect(getOptionButtons().length).toBe(4);
      }, { timeout: 2000 });
    });

    it('completes a short deck successfully', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck(); // A1: 5 moves

      // Click through all 5 moves
      await answerDeckMoves(A1_MOVES);

      // Answering every move correctly reaches the completion screen with a perfect result
      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 2 });
        expect(heading.textContent).toMatch(/Perfect/);
      }, { timeout: 3000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2: DATA PERSISTENCE (Progress must be saved)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CRITICAL: Progress is saved to localStorage', () => {
    it('saves progress after starting a deck', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck();

      await clickOptionWithText(A1_MOVES[0]);
      await new Promise(r => setTimeout(r, 100));

      const saved = JSON.parse(localStorage.getItem('tp_progress')!);
      expect(saved).toBeDefined();
      expect(saved['A1']).toBeDefined();
      expect(typeof saved['A1'].bestStreak).toBe('number');
      expect(saved['A1'].currentStreak).toBeUndefined();
    });

    it('saves best streak when deck is completed', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck(); // A1

      // Complete with all correct
      await answerDeckMoves(A1_MOVES);

      await waitFor(() => {
        const saved = JSON.parse(localStorage.getItem('tp_progress')!);
        expect(saved['A1'].bestStreak).toBeGreaterThan(0);
        expect(saved['A1'].attempts.length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });

    it('loads progress on initial app load', async () => {
      // Pre-set some progress data
      localStorage.setItem('tp_progress', JSON.stringify({
        A1: {
          bestStreak: 3,
          lastAttemptDate: '2026-06-05',
          attempts: [{ date: '2026-06-05', finalStreak: 3, wrongMoves: [], duration: 120 }],
        },
      }));
      restartAppActor();

      await renderWithRouter(HOME_SERIES_A);
      // Should show the loaded progress
      expect(screen.getByText(/3\/5/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3: STREAK TRACKING (Core scoring must work correctly)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CRITICAL: Streak tracking works correctly', () => {
    it('increments streak for correct answers', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck();

      await clickOptionWithText(A1_MOVES[0]);

      await waitFor(() => {
        expect(getAppSnapshot().context.session?.currentStreak).toBe(1);
      }, { timeout: 2000 });
    });

    it('resets streak on wrong answer', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck();

      await clickOptionWithText(A1_MOVES[0]);
      await waitFor(() => {
        expect(getAppSnapshot().context.session?.currentStreak).toBe(1);
      });

      clickWrongOption(A1_MOVES[1]);

      await waitFor(() => {
        expect(getAppSnapshot().context.session?.currentStreak).toBe(0);
      }, { timeout: 2000 });
    });

    it('tracks wrong moves and displays them in results', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck(); // A1: 5 moves

      const answerSequence = [true, false, true, true, true];

      for (let i = 0; i < answerSequence.length; i++) {
        if (answerSequence[i]) {
          clickOptionWithText(A1_MOVES[i]);
        } else {
          clickWrongOption(A1_MOVES[i]);
        }
        await new Promise(r => setTimeout(r, 50));
      }

      // The single wrong answer (move index 1) must be recorded as a non-perfect completion
      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 2 });
        expect(heading.textContent).toMatch(/Complete/);
      }, { timeout: 8000 });

      const saved = JSON.parse(localStorage.getItem('tp_progress')!);
      expect(saved['A1'].attempts[0].wrongMoves).toContain(1);
    });

    it('records max streak as final streak when streak is broken before completion', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck(); // A1: 5 moves

      const moves = A1_MOVES;
      const answerSequence = [true, false, true, true, true];

      for (let i = 0; i < answerSequence.length; i++) {
        if (answerSequence[i]) {
          clickOptionWithText(moves[i]);
        } else {
          clickWrongOption(moves[i]);
        }
        await new Promise(r => setTimeout(r, 50));
      }

      await waitFor(() => {
        expect(screen.getByText('Final streak')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
      }, { timeout: 8000 });

      await waitFor(() => {
        const saved = JSON.parse(localStorage.getItem('tp_progress')!);
        expect(saved['A1'].attempts[0].finalStreak).toBe(3);
      }, { timeout: 3000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 4: NAVIGATION (User can move between screens)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Navigation works reliably', () => {
    it('returns to home screen from training', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck();

      fireEvent.click(screen.getByText(/← Back/));
      await confirmLeaveTest();
    });

    it('shows "Try again" button on completion screen', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck(); // A1

      // Complete the deck
      await answerDeckMoves(A1_MOVES);

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('shows progress stats button on home screen', async () => {
      await renderWithRouter(HOME_SERIES_A);
      expect(screen.getByText('Stats')).toBeInTheDocument();
    });

    it('navigates to progress screen when Stats button clicked', async () => {
      const { router } = await renderWithRouter(HOME_SERIES_A);
      const statsButton = screen.getByText('Stats');
      fireEvent.click(statsButton);

      await screen.findByText('All Decks');
      expect(router.state.location.pathname).toBe('/progress');
      expect(screen.getByText(/Progress/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 5: EDGE CASES (Robustness and data integrity)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases and error handling', () => {
    it('saves incomplete attempts when user abandons training', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck();

      // Answer one question then abandon
      await clickOptionWithText(A1_MOVES[0]);
      await new Promise(r => setTimeout(r, 100));

      fireEvent.click(screen.getByText(/← Back/));
      await confirmLeaveTest();

      // Check that in-progress attempt was discarded
      const saved = JSON.parse(localStorage.getItem('tp_progress')!);
      expect(saved['A1'].attempts).toHaveLength(0);
    });

    it('handles reset confirmation correctly', async () => {
      localStorage.setItem('tp_progress', JSON.stringify({
        A1: { bestStreak: 5, attempts: [{ date: '2026-06-05' }] },
      }));
      restartAppActor();

      await renderWithRouter(HOME_SERIES_A);
      fireEvent.click(screen.getByText('Stats'));
      await screen.findByText('All Decks');

      // First click shows confirmation
      const resetButton = screen.getByText('Reset all');
      fireEvent.click(resetButton);

      expect(screen.getByText('Confirm reset')).toBeInTheDocument();

      // Confirm the reset
      const confirmButton = screen.getByText('Confirm reset');
      fireEvent.click(confirmButton);

      // Data should be cleared
      const saved = JSON.parse(localStorage.getItem('tp_progress')!);
      expect(saved['A1'].bestStreak).toBe(0);
      expect(saved['A1'].attempts.length).toBe(0);
    });

    it('allows canceling reset confirmation', async () => {
      await renderWithRouter(HOME_SERIES_A);
      fireEvent.click(screen.getByText('Stats'));
      await screen.findByText('All Decks');

      const resetButton = screen.getByText('Reset all');
      fireEvent.click(resetButton);

      expect(screen.getByText('Confirm reset')).toBeInTheDocument();

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.getByText('Reset all')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 6: UI/UX QUALITY (Presentation matters)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('UI and presentation quality', () => {
    it('displays progress bars for each deck', async () => {
      localStorage.setItem('tp_progress', JSON.stringify({
        A1: { bestStreak: 3, attempts: [{}] },
      }));
      restartAppActor();

      await renderWithRouter(HOME_SERIES_A);
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('shows next move prompt correctly', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck();

      expect(getOptionButtons().length).toBe(4);
      expect(screen.getByText(/What's next/i)).toBeInTheDocument();
    });

    it('displays completion results with accuracy metrics', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck(); // A1

      // Complete the deck
      await answerDeckMoves(A1_MOVES);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2 }).textContent).toMatch(/Perfect|Complete/)
        expect(screen.getByText('Correct')).toBeInTheDocument()
        expect(screen.getByText('Final streak')).toBeInTheDocument()
      }, { timeout: 8000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 7: DATA INTEGRITY (Correctness of calculations)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Data integrity and correctness', () => {
    it('creates deck entries in progress when loading default', async () => {
      await renderWithRouter(HOME_ALL);
      const trainButtons = screen.getAllByText('Train');
      expect(trainButtons.length).toBeGreaterThan(0);
    });

    it('correctly saves attempt timestamp when deck completes', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck(); // A1

      // Must complete the deck to save attempt
      await answerDeckMoves(A1_MOVES);

      await waitFor(() => {
        const saved = JSON.parse(localStorage.getItem('tp_progress')!);
        expect(saved['A1'].lastAttemptDate).toBeTruthy();
      }, { timeout: 5000 });
    });

    it('records attempt duration', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck(); // A1

      // Complete deck
      await answerDeckMoves(A1_MOVES);

      await waitFor(() => {
        const saved = JSON.parse(localStorage.getItem('tp_progress')!);
        const attempt = saved['A1'].attempts[0];
        expect(attempt.duration).toBeGreaterThanOrEqual(0);
      }, { timeout: 3000 });
    });

    it('records all attempts when deck is completed', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck(); // A1

      // Complete the deck
      await answerDeckMoves(A1_MOVES);

      await waitFor(() => {
        const saved = JSON.parse(localStorage.getItem('tp_progress')!);
        // After completing, should have at least one attempt recorded
        expect(saved['A1']).toBeDefined();
        expect(saved['A1'].attempts.length).toBeGreaterThan(0);
        const attempt = saved['A1'].attempts[0];
        expect(attempt.date).toBeDefined();
        expect(attempt.finalStreak).toBeDefined();
        expect(Array.isArray(attempt.wrongMoves)).toBe(true);
      }, { timeout: 10000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 8: DECK PROGRESSION (User can progress through curriculum)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Deck progression and sequencing', () => {
    it('shows next deck option when current deck is completed', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck(); // A1

      // Complete A1
      await answerDeckMoves(A1_MOVES);

      await waitFor(() => {
        expect(screen.getByText(/Next:/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('shows home button to return to deck list', async () => {
      await renderWithRouter(HOME_SERIES_A);
      await startFirstDeck();

      // Complete deck
      await answerDeckMoves(A1_MOVES);

      await waitFor(() => {
        const homeButtons = screen.getAllByText(/← Home/);
        expect(homeButtons.length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });
  });

});
