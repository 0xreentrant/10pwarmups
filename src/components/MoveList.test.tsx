import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MoveList from './MoveList'
import type { Deck } from '../types/domain'

const testDeck: Deck = {
  id: 'T1',
  name: 'Test Deck',
  moves: [
    { text: 'Move Alpha', players: ['A'] },
    { text: 'Move Beta', players: ['B'] },
  ],
  notes: { 0: 'Alpha coaching note' },
}

function renderList(overrides = {}) {
  return render(
    <MoveList
      deck={testDeck}
      moveSequence={[
        { moveIndex: 0, correct: true },
        { moveIndex: 1, correct: false },
      ]}
      visibleThroughIndex={1}
      {...overrides}
    />
  )
}

function clickMoveLabel(text: string) {
  const btn = screen.getByRole('button', { name: text })
  fireEvent.click(btn)
}

describe('MoveList', () => {
  it('shows note text when move has notes', () => {
    renderList()
    clickMoveLabel('Move Alpha')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Alpha coaching note')).toBeInTheDocument()
    expect(screen.getByTestId('popover-backdrop')).toBeInTheDocument()
  })

  it('shows empty state when move has no notes', () => {
    renderList()
    clickMoveLabel('Move Beta')
    expect(screen.getByText('No notes for this move')).toBeInTheDocument()
  })

  it('closes popover when X button is clicked', () => {
    renderList()
    clickMoveLabel('Move Alpha')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes popover on Escape', () => {
    renderList()
    clickMoveLabel('Move Alpha')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes popover on backdrop click', () => {
    renderList()
    clickMoveLabel('Move Alpha')
    fireEvent.mouseDown(screen.getByTestId('popover-backdrop'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calls onMoveClick instead of opening notes when provided', () => {
    const onMoveClick = vi.fn()
    renderList({ onMoveClick })
    clickMoveLabel('Move Beta')
    expect(onMoveClick).toHaveBeenCalledWith(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
