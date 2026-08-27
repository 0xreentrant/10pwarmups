import { describe, it, expect } from 'vitest'
import { createDistractorPool, homeDeckRowLabel, homeSectionHash, precomputeDeckOptions } from './utils/deckUtils'
import type { Deck } from './types/domain'

const mockDecks: Deck[] = [
  {
    id: 'A1',
    name: 'Kneeling',
    series: 'A',
    moves: [
      { text: 'Kneeling Granby', partner: 'A' },
      { text: 'Seated Granby', partner: 'A' },
      { text: 'Bridging Granby', partner: 'A' },
    ],
  },
  {
    id: 'B1',
    name: 'Black Mamba',
    series: 'B',
    moves: [
      { text: 'Black Mamba', partner: 'A' },
      { text: 'Kneeling Granby', partner: 'B' },
      { text: 'Peel', partner: 'B' },
    ],
  },
]

describe('createDistractorPool', () => {
  it('collects unique move names from all decks', () => {
    const pool = createDistractorPool(mockDecks)
    expect(pool).toContain('Kneeling Granby')
    expect(pool).toContain('Peel')
    expect(new Set(pool).size).toBe(pool.length)
    expect(pool.length).toBe(5)
  })
})

describe('precomputeDeckOptions', () => {
  it('precomputes one option set per move with 4 choices', () => {
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
        expect(o.partner).toBeUndefined()
      })
    })
  })

  it('uses unique distractors that are not the correct move', () => {
    const allOptions = precomputeDeckOptions(mockDecks[0], mockDecks)
    allOptions.forEach((opts, i) => {
      const move = mockDecks[0].moves[i]
      const wrongTexts = opts.filter(o => !o.correct).map(o => o.text)
      expect(wrongTexts.every(t => t !== move.text)).toBe(true)
      expect(new Set(wrongTexts).size).toBe(3)
    })
  })

  it('regenerates the distractor pool when the cursor is exhausted', () => {
    const tinyDecks: Deck[] = [
      { id: 'solo', name: 'Solo', moves: [{ text: 'OnlyMove', partner: 'A' }] },
      {
        id: 'pool',
        name: 'Pool',
        moves: [
          { text: 'Alpha', partner: 'A' },
          { text: 'Beta', partner: 'B' },
          { text: 'Gamma', partner: 'A' },
        ],
      },
    ]
    const longDeck: Deck = {
      id: 'long',
      name: 'Long',
      moves: Array.from({ length: 8 }, (_, i) => ({ text: `Move${i}`, partner: 'A' as const })),
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

describe('homeDeckRowLabel / homeSectionHash', () => {
  it('maps series and named-flow row labels and section anchors', () => {
    expect(homeDeckRowLabel(mockDecks[0])).toBe('A1')
    expect(homeDeckRowLabel({ id: 'attack-series', name: 'Attack Series', moves: [] })).toBe('AS')
    expect(homeDeckRowLabel({ id: 'custom-flow', name: 'Custom Flow', moves: [] })).toBe('Custom Flow')
    expect(homeSectionHash(mockDecks[0])).toBe('series-A')
    expect(homeSectionHash({ id: 'attack-series', name: 'Attack Series', moves: [] })).toBe('named-flows')
  })
})
