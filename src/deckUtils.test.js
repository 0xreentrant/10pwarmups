import { describe, it, expect } from 'vitest'
import { createDistractorPool, getMoveNote, precomputeDeckOptions } from './utils/deckUtils'

const mockDecks = [
  {
    id: 'A1',
    moves: [
      { text: 'Kneeling Granby', partner: 'A' },
      { text: 'Seated Granby', partner: 'A' },
      { text: 'Bridging Granby', partner: 'A' },
    ],
  },
  {
    id: 'B1',
    moves: [
      { text: 'Black Mamba', partner: 'A' },
      { text: 'Kneeling Granby', partner: 'B' },
      { text: 'Peel', partner: 'B' },
    ],
  },
]

describe('getMoveNote', () => {
  const deckWithNotes = {
    id: 'T1',
    moves: [{ text: 'Alpha', partner: 'A' }, { text: 'Beta', partner: 'B' }],
    notes: { 0: 'First move note', 1: '   ' },
  }

  it('returns trimmed note when present', () => {
    expect(getMoveNote(deckWithNotes, 0)).toBe('First move note')
  })

  it('returns null for blank note', () => {
    expect(getMoveNote(deckWithNotes, 1)).toBe(null)
  })

  it('returns null for missing key', () => {
    expect(getMoveNote(deckWithNotes, 2)).toBe(null)
  })

  it('returns null when deck has no notes object', () => {
    expect(getMoveNote({ id: 'T2', moves: [] }, 0)).toBe(null)
  })
})

describe('createDistractorPool', () => {
  it('collects unique move names from all decks without partner', () => {
    const pool = createDistractorPool(mockDecks)
    expect(pool).toContain('Kneeling Granby')
    expect(pool).toContain('Peel')
    expect(new Set(pool).size).toBe(pool.length)
    expect(pool.length).toBe(5)
  })

  it('returns a new shuffled array without mutating prior pools', () => {
    const first = createDistractorPool(mockDecks)
    const second = createDistractorPool(mockDecks)
    expect(first).not.toBe(second)
    expect([...first].sort()).toEqual([...second].sort())
  })
})

describe('precomputeDeckOptions', () => {
  it('precomputes one option set per move in the deck', () => {
    const allOptions = precomputeDeckOptions(mockDecks[0], mockDecks)
    expect(allOptions).toHaveLength(mockDecks[0].moves.length)
    allOptions.forEach(opts => {
      expect(opts).toHaveLength(4)
    })
  })

  it('always includes the correct next move with partner on the answer only', () => {
    const allOptions = precomputeDeckOptions(mockDecks[0], mockDecks)
    allOptions.forEach((opts, i) => {
      const move = mockDecks[0].moves[i]
      const correct = opts.filter(o => o.correct)
      expect(correct).toHaveLength(1)
      expect(correct[0].text).toBe(move.text)
      expect(correct[0].partner).toBe(move.partner)
      opts.filter(o => !o.correct).forEach(o => {
        expect(o.text).not.toBe(move.text)
        expect(o.partner).toBeUndefined()
      })
    })
  })

  it('uses unique distractors within each question', () => {
    const allOptions = precomputeDeckOptions(mockDecks[0], mockDecks)
    allOptions.forEach(opts => {
      const wrongTexts = opts.filter(o => !o.correct).map(o => o.text)
      expect(new Set(wrongTexts).size).toBe(3)
    })
  })

  it('regenerates the distractor pool when the cursor is exhausted', () => {
    const tinyDecks = [
      { id: 'solo', moves: [{ text: 'OnlyMove', partner: 'A' }] },
      {
        id: 'pool',
        moves: [
          { text: 'Alpha', partner: 'A' },
          { text: 'Beta', partner: 'B' },
          { text: 'Gamma', partner: 'A' },
        ],
      },
    ]
    const longDeck = {
      id: 'long',
      moves: Array.from({ length: 8 }, (_, i) => ({ text: `Move${i}`, partner: 'A' })),
    }
    const allOptions = precomputeDeckOptions(longDeck, tinyDecks)
    allOptions.forEach((opts, i) => {
      const move = longDeck.moves[i]
      expect(opts.some(o => o.correct && o.text === move.text)).toBe(true)
      const wrongTexts = opts.filter(o => !o.correct).map(o => o.text)
      expect(wrongTexts.every(t => t !== move.text)).toBe(true)
      expect(new Set(wrongTexts).size).toBe(3)
    })
  })
})
