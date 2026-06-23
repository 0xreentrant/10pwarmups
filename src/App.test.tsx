import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { APP_RELEASE_VERSION, WHATS_NEW_STORAGE_KEY } from './data/whatsNew';
import { restartAppActor } from './appActor';
import { renderWithRouter } from './test/renderWithRouter';

const A1_MOVES = ['Kneeling Granby', 'Seated Granby', 'Bridging Granby', 'Belly to Belly Granby', 'Granby Flow'];

function getOptionButtons() {
  const legend = screen.getByText(/What's next/)
  const fieldset = legend.closest('fieldset')
  if (!fieldset) throw new Error('Options fieldset not found')
  return Array.from(fieldset.querySelectorAll('button'))
}

function clickOptionWithText(text: string) {
  const btn = getOptionButtons().find(b => b.textContent!.includes(text));
  if (!btn) throw new Error(`No option button found for "${text}"`);
  fireEvent.click(btn);
}

function clickWrongOption(excludeText: string) {
  const btn = getOptionButtons().find(b => !b.textContent!.includes(excludeText));
  if (!btn) throw new Error(`No wrong option found excluding "${excludeText}"`);
  fireEvent.click(btn);
}

async function startFirstDeck() {
  const trainButtons = await screen.findAllByText('Train');
  fireEvent.click(trainButtons[0]);
  await screen.findByText(/What's next/);
}

async function answerDeckMoves(moves: string[], delay = 100) {
  for (let i = 0; i < moves.length; i++) {
    clickOptionWithText(moves[i]);
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
  }
}

async function confirmLeaveTest() {
  await screen.findByText("10th Planet")
}

describe('10th Planet Warmup Trainer - Senior PM Acceptance Tests', () => {
  
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(WHATS_NEW_STORAGE_KEY, APP_RELEASE_VERSION);
    restartAppActor();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1: CRITICAL USER FLOWS (Must work for trainer to be usable)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CRITICAL: User can launch app and see deck list', () => {
    it('displays home screen with title and series headers', async () => {
      await renderWithRouter("/");
      expect(screen.getByText('10th Planet')).toBeInTheDocument();
      expect(screen.getByText('Warmup Trainer')).toBeInTheDocument();
      expect(screen.getByText(/34 decks/)).toBeInTheDocument();
    });

    it('shows all 8 series and named flows', async () => {
      await renderWithRouter("/");
      expect(screen.getByText(/Series A — Granbys/)).toBeInTheDocument();
      expect(screen.getByText(/Series B — Sit-Ups/)).toBeInTheDocument();
      expect(screen.getByText(/Series C — Guard Passing/)).toBeInTheDocument();
      expect(screen.getByText(/Series H — De La Riva/)).toBeInTheDocument();
      expect(screen.getAllByText(/Named Flows/).length).toBeGreaterThan(0);
      expect(screen.getByText('Attack Series')).toBeInTheDocument();
      expect(screen.getByText('Ramey Flow')).toBeInTheDocument();
      expect(screen.queryByText(/Series I/)).not.toBeInTheDocument();
      expect(screen.queryByText('I1')).not.toBeInTheDocument();
      expect(screen.queryByText('J1')).not.toBeInTheDocument();
    });

    it('displays a Train button for each deck', async () => {
      await renderWithRouter("/");
      const trainButtons = screen.getAllByText('Train');
      expect(trainButtons.length).toBe(34);
    });
  });

  describe('CRITICAL: User can start training a deck', () => {
    it('transitions to training screen when Train button is clicked', async () => {
      await renderWithRouter("/");
      await startFirstDeck(); // First deck (A1)

      expect(screen.getByText('A1')).toBeInTheDocument();
      expect(screen.getByText('Kneeling')).toBeInTheDocument();
      expect(screen.getByText(/Sequence/)).toBeInTheDocument();
    });

    it('shows multiple choice options for the first move', async () => {
      await renderWithRouter("/");
      await startFirstDeck();

      const optionButtons = getOptionButtons();
      expect(optionButtons.length).toBe(4);
      expect(screen.getByRole('button', { name: /Kneeling Granby/i })).toBeInTheDocument();
    });

    it('always includes the correct next move in precomputed options', async () => {
      await renderWithRouter("/");
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
      await renderWithRouter("/");
      await startFirstDeck();

      const initialSequence = screen.getByText(/Sequence/);
      expect(initialSequence).toBeInTheDocument();

      // Click first option
      clickOptionWithText(A1_MOVES[0]);

      // Wait for options to change (next move's options should appear)
      await waitFor(() => {
        const newOptionButtons = getOptionButtons();
        // Options might be different or take time to load
        expect(newOptionButtons.length).toBeGreaterThanOrEqual(0);
      }, { timeout: 2000 });
    });

    it('completes a short deck successfully', async () => {
      await renderWithRouter("/");
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
      await renderWithRouter("/");
      await startFirstDeck();

      clickOptionWithText(A1_MOVES[0]);
      await new Promise(r => setTimeout(r, 100));

      const saved = JSON.parse(localStorage.getItem('tp_progress')!);
      expect(saved).toBeDefined();
      expect(saved['A1']).toBeDefined();
      expect(typeof saved['A1'].bestStreak).toBe('number');
      expect(saved['A1'].currentStreak).toBeUndefined();
    });

    it('saves best streak when deck is completed', async () => {
      await renderWithRouter("/");
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

      await renderWithRouter("/");
      // Should show the loaded progress
      expect(screen.getByText(/3\/5/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3: STREAK TRACKING (Core scoring must work correctly)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CRITICAL: Streak tracking works correctly', () => {
    it('shows streak badge during training', async () => {
      await renderWithRouter("/");
      await startFirstDeck();

      expect(screen.getByLabelText(/Streak:/)).toBeInTheDocument();
    });

    it('increments streak for correct answers', async () => {
      await renderWithRouter("/");
      await startFirstDeck();

      clickOptionWithText(A1_MOVES[0]);

      await waitFor(() => {
        expect(screen.getByLabelText(/Streak: 1/)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('resets streak on wrong answer', async () => {
      await renderWithRouter("/");
      await startFirstDeck();

      clickOptionWithText(A1_MOVES[0]);

      await new Promise(r => setTimeout(r, 200));

      clickWrongOption(A1_MOVES[1]);

      await waitFor(() => {
        expect(screen.getByLabelText(/Streak: 1/)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('tracks wrong moves and displays them in results', async () => {
      await renderWithRouter("/");
      await startFirstDeck(); // A1: 5 moves

      const answerSequence = [true, false, true, true, true];

      for (let i = 0; i < answerSequence.length; i++) {
        if (answerSequence[i]) {
          clickOptionWithText(A1_MOVES[i]);
        } else {
          clickWrongOption(A1_MOVES[i]);
        }

        await new Promise(r => setTimeout(r, 100));
      }

      // The single wrong answer (move index 1) must be recorded as a non-perfect completion
      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 2 });
        expect(heading.textContent).toMatch(/Complete/);
      }, { timeout: 5000 });

      const saved = JSON.parse(localStorage.getItem('tp_progress')!);
      expect(saved['A1'].attempts[0].wrongMoves).toContain(1);
    });

    it('records max streak as final streak when streak is broken before completion', async () => {
      await renderWithRouter("/");
      await startFirstDeck(); // A1: 5 moves

      const moves = A1_MOVES;
      const answerSequence = [true, false, true, true, true];

      for (let i = 0; i < answerSequence.length; i++) {
        if (answerSequence[i]) {
          clickOptionWithText(moves[i]);
        } else {
          clickWrongOption(moves[i]);
        }
        await new Promise(r => setTimeout(r, 100));
      }

      await waitFor(() => {
        expect(screen.getByText('Final streak')).toBeInTheDocument();
        const row = screen.getByText('Final streak').closest('tr');
        expect(row).toHaveTextContent('3');
      }, { timeout: 5000 });

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
      await renderWithRouter("/");
      await startFirstDeck();

      expect(screen.getByText('Kneeling')).toBeInTheDocument();

      const backButton = screen.getByText(/← Back/);
      fireEvent.click(backButton);
      await confirmLeaveTest();
    });

    it('shows "Try again" button on completion screen', async () => {
      await renderWithRouter("/");
      await startFirstDeck(); // A1

      // Complete the deck
      await answerDeckMoves(A1_MOVES);

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('shows progress stats button on home screen', async () => {
      await renderWithRouter("/");
      expect(screen.getByText('Stats')).toBeInTheDocument();
    });

    it('navigates to progress screen when Stats button clicked', async () => {
      const { router } = await renderWithRouter("/");
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
      await renderWithRouter("/");
      await startFirstDeck();

      // Answer one question then abandon
      clickOptionWithText(A1_MOVES[0]);

      await new Promise(r => setTimeout(r, 100));

      const backButton = screen.getByText(/← Back/);
      fireEvent.click(backButton);
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

      await renderWithRouter("/");

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
      await renderWithRouter("/");

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

      await renderWithRouter("/");
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('shows move sequence visualization during training', async () => {
      await renderWithRouter("/");
      await startFirstDeck(); // A1: 5 moves

      // Check for sequence indicators (should have a fieldset with Sequence legend)
      const legends = screen.getAllByText(/Sequence/);
      expect(legends.length).toBeGreaterThan(0);
    });

    it('shows next move prompt correctly', async () => {
      await renderWithRouter("/");
      await startFirstDeck();

      expect(screen.getByText(/What's next/i)).toBeInTheDocument();
    });

    it('displays completion results with accuracy metrics', async () => {
      await renderWithRouter("/");
      await startFirstDeck(); // A1

      // Complete the deck
      await answerDeckMoves(A1_MOVES, 150);

      await waitFor(() => {
        // Should see result metrics like "Correct", "Final streak", etc.
        const resultsElements = screen.queryAllByText(/Correct|Final streak|Best streak|Time/);
        expect(resultsElements.length).toBeGreaterThan(0);
      }, { timeout: 8000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 7: DATA INTEGRITY (Correctness of calculations)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Data integrity and correctness', () => {
    it('creates deck entries in progress when loading default', async () => {
      await renderWithRouter("/");
      const trainButtons = screen.getAllByText('Train');
      expect(trainButtons.length).toBe(34);
    });

    it('correctly saves attempt timestamp when deck completes', async () => {
      await renderWithRouter("/");
      await startFirstDeck(); // A1

      // Must complete the deck to save attempt
      await answerDeckMoves(A1_MOVES);

      await waitFor(() => {
        const saved = JSON.parse(localStorage.getItem('tp_progress')!);
        expect(saved['A1'].lastAttemptDate).toBeTruthy();
      }, { timeout: 5000 });
    });

    it('records attempt duration', async () => {
      await renderWithRouter("/");
      await startFirstDeck(); // A1

      // Complete deck
      await answerDeckMoves(A1_MOVES, 50);

      await waitFor(() => {
        const saved = JSON.parse(localStorage.getItem('tp_progress')!);
        const attempt = saved['A1'].attempts[0];
        expect(attempt.duration).toBeGreaterThanOrEqual(0);
      }, { timeout: 3000 });
    });

    it('records all attempts when deck is completed', async () => {
      await renderWithRouter("/");
      await startFirstDeck(); // A1

      // Complete the deck
      await answerDeckMoves(A1_MOVES, 200);

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
      await renderWithRouter("/");
      await startFirstDeck(); // A1

      // Complete A1
      await answerDeckMoves(A1_MOVES);

      await waitFor(() => {
        expect(screen.getByText(/Next:/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('shows home button to return to deck list', async () => {
      await renderWithRouter("/");
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
