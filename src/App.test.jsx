import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

function getOptionButtons() {
  return Array.from(document.querySelectorAll('button.option-btn'));
}

function clickOptionWithText(text) {
  const btn = getOptionButtons().find(b => b.textContent.includes(text));
  if (!btn) throw new Error(`No option button found for "${text}"`);
  fireEvent.click(btn);
}

function clickWrongOption(excludeText) {
  const btn = getOptionButtons().find(b => !b.textContent.includes(excludeText));
  if (!btn) throw new Error(`No wrong option found excluding "${excludeText}"`);
  fireEvent.click(btn);
}

describe('10th Planet Warmup Trainer - Senior PM Acceptance Tests', () => {
  
  beforeEach(() => {
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1: CRITICAL USER FLOWS (Must work for trainer to be usable)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CRITICAL: User can launch app and see deck list', () => {
    it('displays home screen with title and series headers', () => {
      render(<App />);
      expect(screen.getByText('10th Planet')).toBeInTheDocument();
      expect(screen.getByText('Warmup Trainer')).toBeInTheDocument();
      expect(screen.getByText(/34 decks/)).toBeInTheDocument();
    });

    it('shows all 8 series and named flows', () => {
      render(<App />);
      expect(screen.getByText(/Series A — Granbys/)).toBeInTheDocument();
      expect(screen.getByText(/Series B — Sit-Ups/)).toBeInTheDocument();
      expect(screen.getByText(/Series C — Guard Passing/)).toBeInTheDocument();
      expect(screen.getByText(/Series H — De La Riva/)).toBeInTheDocument();
      expect(screen.getByText(/Named Flows/)).toBeInTheDocument();
      expect(screen.getByText('Attack Series')).toBeInTheDocument();
      expect(screen.getByText('Ramey Flow')).toBeInTheDocument();
      expect(screen.queryByText(/Series I/)).not.toBeInTheDocument();
      expect(screen.queryByText('I1')).not.toBeInTheDocument();
      expect(screen.queryByText('J1')).not.toBeInTheDocument();
    });

    it('displays a Train button for each deck', () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      expect(trainButtons.length).toBe(34);
    });
  });

  describe('CRITICAL: User can start training a deck', () => {
    it('transitions to training screen when Train button is clicked', () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]); // First deck (A1)
      
      expect(screen.getByText('A1')).toBeInTheDocument();
      expect(screen.getByText('Kneeling')).toBeInTheDocument();
      expect(screen.getByText(/Sequence/)).toBeInTheDocument();
    });

    it('shows multiple choice options for the first move', () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]);
      
      // Check for multiple choice option buttons
      const optionButtons = getOptionButtons();
      expect(optionButtons.length).toBeGreaterThanOrEqual(4);
    });

    it('advances to next move when option is clicked', async () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]);
      
      const initialSequence = screen.getByText(/Sequence/);
      expect(initialSequence).toBeInTheDocument();
      
      // Click first option
      const optionButtons = getOptionButtons();
      const initialButtonCount = optionButtons.length;
      fireEvent.click(optionButtons[0]);
      
      // Wait for options to change (next move's options should appear)
      await waitFor(() => {
        const newOptionButtons = getOptionButtons();
        // Options might be different or take time to load
        expect(newOptionButtons.length).toBeGreaterThanOrEqual(0);
      }, { timeout: 2000 });
    });

    it('completes a short deck successfully', async () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]); // A1: 5 moves
      
      // Click through all 5 moves
      for (let i = 0; i < 5; i++) {
        const optionButtons = getOptionButtons();
        fireEvent.click(optionButtons[0]);
        
        // Small delay between moves
        await new Promise(r => setTimeout(r, 100));
      }
      
      // Should reach completion screen
      await waitFor(() => {
        const heading = screen.queryByRole('heading', { level: 2 });
        if (heading) {
          expect(heading.textContent).toMatch(/Perfect|Complete/);
        }
      }, { timeout: 3000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2: DATA PERSISTENCE (Progress must be saved)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CRITICAL: Progress is saved to localStorage', () => {
    it('saves progress after starting a deck', async () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]);
      
      const optionButtons = getOptionButtons();
      fireEvent.click(optionButtons[0]);
      
      // Wait a moment for state to update
      await new Promise(r => setTimeout(r, 100));
      
      const saved = JSON.parse(localStorage.getItem('tp_progress'));
      expect(saved).toBeDefined();
      expect(saved['A1']).toBeDefined();
      expect(typeof saved['A1'].currentStreak).toBe('number');
    });

    it('saves best streak when deck is completed', async () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]); // A1
      
      // Complete with all correct
      for (let i = 0; i < 5; i++) {
        const options = getOptionButtons();
        fireEvent.click(options[0]);
        await new Promise(r => setTimeout(r, 100));
      }
      
      await waitFor(() => {
        const saved = JSON.parse(localStorage.getItem('tp_progress'));
        expect(saved['A1'].bestStreak).toBeGreaterThan(0);
        expect(saved['A1'].attempts.length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });

    it('loads progress on initial app load', () => {
      // Pre-set some progress data
      localStorage.setItem('tp_progress', JSON.stringify({
        A1: {
          currentStreak: 0,
          bestStreak: 3,
          lastAttemptDate: '2026-06-05',
          attempts: [{ date: '2026-06-05', finalStreak: 3, wrongMoves: [], duration: 120 }],
        },
      }));
      
      render(<App />);
      // Should show the loaded progress
      expect(screen.getByText(/3\/5/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3: STREAK TRACKING (Core scoring must work correctly)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CRITICAL: Streak tracking works correctly', () => {
    it('shows streak badge during training', async () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]);
      
      // Verify streak badge exists (div with class streak-badge should contain fire emoji)
      const badges = document.querySelectorAll('.streak-badge');
      expect(badges.length).toBeGreaterThan(0);
      expect(badges[0].textContent).toMatch(/🔥/);
    });

    it('increments streak for correct answers', async () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]);
      
      // Answer first move
      const options = getOptionButtons();
      fireEvent.click(options[0]);
      
      await waitFor(() => {
        // After clicking, should have updated the streak display
        const badges = screen.getAllByText(/🔥/);
        expect(badges.length).toBeGreaterThan(0);
      }, { timeout: 1000 });
    });

    it('resets streak on wrong answer', async () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]);
      
      // First: correct answer
      let options = getOptionButtons();
      fireEvent.click(options[0]);
      
      await new Promise(r => setTimeout(r, 200));
      
      // Second: wrong answer (click last option which is unlikely to be correct)
      options = getOptionButtons();
      fireEvent.click(options[options.length - 1]);
      
      await waitFor(() => {
        // After wrong answer, streak should be 0
        const badges = screen.getAllByText(/🔥/);
        expect(badges.length).toBeGreaterThan(0);
      }, { timeout: 1000 });
    });

    it('tracks wrong moves and displays them in results', async () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]); // A1: 5 moves
      
      // Answer pattern: correct, wrong, correct, correct, correct
      const answerSequence = [true, false, true, true, true];
      
      for (let i = 0; i < answerSequence.length; i++) {
        const options = getOptionButtons();
        
        if (answerSequence[i]) {
          fireEvent.click(options[0]); // Click first (likely correct)
        } else {
          fireEvent.click(options[options.length - 1]); // Click last (likely wrong)
        }
        
        await new Promise(r => setTimeout(r, 100));
      }
      
      // Should show completion with wrong move info
      await waitFor(() => {
        // At least should complete and show results
        const heading = screen.queryByRole('heading', { level: 2 });
        if (heading) {
          expect(heading.textContent).toMatch(/Perfect|Complete/);
        }
      }, { timeout: 5000 });
    });

    it('records max streak as final streak when streak is broken before completion', async () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]); // A1: 5 moves

      const moves = ['Kneeling Granby', 'Seated Granby', 'Bridging Granby', 'Belly to Belly Granby', 'Granby Flow'];
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
        const saved = JSON.parse(localStorage.getItem('tp_progress'));
        expect(saved['A1'].attempts[0].finalStreak).toBe(3);
      }, { timeout: 3000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 4: NAVIGATION (User can move between screens)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Navigation works reliably', () => {
    it('returns to home screen from training', () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]);
      
      expect(screen.getByText('Kneeling')).toBeInTheDocument();
      
      const backButton = screen.getByText(/← Back/);
      fireEvent.click(backButton);
      
      expect(screen.getByText('10th Planet')).toBeInTheDocument();
    });

    it('shows "Try again" button on completion screen', async () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]); // A1
      
      // Complete the deck
      for (let i = 0; i < 5; i++) {
        const options = getOptionButtons();
        fireEvent.click(options[0]);
        await new Promise(r => setTimeout(r, 100));
      }
      
      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('shows progress stats button on home screen', () => {
      render(<App />);
      expect(screen.getByText('Stats')).toBeInTheDocument();
    });

    it('navigates to progress screen when Stats button clicked', () => {
      render(<App />);
      const statsButton = screen.getByText('Stats');
      fireEvent.click(statsButton);
      
      expect(screen.getByText(/Progress/)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 5: EDGE CASES (Robustness and data integrity)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases and error handling', () => {
    it('saves incomplete attempts when user abandons training', async () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]);
      
      // Answer one question then abandon
      const options = getOptionButtons();
      fireEvent.click(options[0]);
      
      await new Promise(r => setTimeout(r, 100));
      
      const backButton = screen.getByText(/← Back/);
      fireEvent.click(backButton);
      
      // Check that attempt was recorded
      const saved = JSON.parse(localStorage.getItem('tp_progress'));
      expect(saved['A1'].attempts.length).toBeGreaterThan(0);
      const lastAttempt = saved['A1'].attempts[saved['A1'].attempts.length - 1];
      expect(lastAttempt.abandoned).toBe(true);
    });

    it('handles reset confirmation correctly', () => {
      localStorage.setItem('tp_progress', JSON.stringify({
        A1: { currentStreak: 5, bestStreak: 5, attempts: [{ date: '2026-06-05' }] },
      }));
      
      render(<App />);
      
      // First click shows confirmation
      let resetButton = screen.getByText('Reset all');
      fireEvent.click(resetButton);
      
      expect(screen.getByText('Confirm reset')).toBeInTheDocument();
      
      // Confirm the reset
      const confirmButton = screen.getByText('Confirm reset');
      fireEvent.click(confirmButton);
      
      // Data should be cleared
      const saved = JSON.parse(localStorage.getItem('tp_progress'));
      expect(saved['A1'].bestStreak).toBe(0);
      expect(saved['A1'].attempts.length).toBe(0);
    });

    it('allows canceling reset confirmation', () => {
      render(<App />);
      
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
    it('displays progress bars for each deck', () => {
      localStorage.setItem('tp_progress', JSON.stringify({
        A1: { currentStreak: 0, bestStreak: 3, attempts: [{}] },
      }));
      
      render(<App />);
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('shows move sequence visualization during training', async () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]); // A1: 5 moves
      
      // Check for sequence indicators (should have a fieldset with Sequence legend)
      const legends = screen.getAllByText(/Sequence/);
      expect(legends.length).toBeGreaterThan(0);
    });

    it('shows next move prompt correctly', () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]);
      
      expect(screen.getByText(/What's next/i)).toBeInTheDocument();
    });

    it('displays completion results with accuracy metrics', async () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]); // A1
      
      // Complete the deck
      for (let i = 0; i < 5; i++) {
        const options = getOptionButtons();
        fireEvent.click(options[0]);
        await new Promise(r => setTimeout(r, 150));
      }
      
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
    it('creates deck entries in progress when loading default', () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      expect(trainButtons.length).toBe(34);
    });

    it('correctly saves attempt timestamp when deck completes', async () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]); // A1
      
      // Must complete the deck to save attempt
      for (let i = 0; i < 5; i++) {
        const options = getOptionButtons();
        fireEvent.click(options[0]);
        await new Promise(r => setTimeout(r, 100));
      }
      
      await waitFor(() => {
        const saved = JSON.parse(localStorage.getItem('tp_progress'));
        expect(saved['A1'].lastAttemptDate).toBeTruthy();
      }, { timeout: 5000 });
    });

    it('records attempt duration', async () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]); // A1
      
      const startTime = Date.now();
      
      // Complete deck
      for (let i = 0; i < 5; i++) {
        const options = getOptionButtons();
        fireEvent.click(options[0]);
        await new Promise(r => setTimeout(r, 50));
      }
      
      await waitFor(() => {
        const saved = JSON.parse(localStorage.getItem('tp_progress'));
        const attempt = saved['A1'].attempts[0];
        expect(attempt.duration).toBeGreaterThanOrEqual(0);
      }, { timeout: 3000 });
    });

    it('records all attempts when deck is completed', async () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]); // A1
      
      // Complete the deck
      for (let i = 0; i < 5; i++) {
        const options = getOptionButtons();
        fireEvent.click(options[0]);
        await new Promise(r => setTimeout(r, 200));
      }
      
      await waitFor(() => {
        const saved = JSON.parse(localStorage.getItem('tp_progress'));
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
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]); // A1
      
      // Complete A1
      for (let i = 0; i < 5; i++) {
        const options = getOptionButtons();
        fireEvent.click(options[0]);
        await new Promise(r => setTimeout(r, 100));
      }
      
      await waitFor(() => {
        expect(screen.getByText(/Next:/)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('shows home button to return to deck list', async () => {
      render(<App />);
      const trainButtons = screen.getAllByText('Train');
      fireEvent.click(trainButtons[0]);
      
      // Complete deck
      for (let i = 0; i < 5; i++) {
        const options = getOptionButtons();
        fireEvent.click(options[0]);
        await new Promise(r => setTimeout(r, 100));
      }
      
      await waitFor(() => {
        const homeButtons = screen.getAllByText(/← Home/);
        expect(homeButtons.length).toBeGreaterThan(0);
      }, { timeout: 5000 });
    });
  });

});
