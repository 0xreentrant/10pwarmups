import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MoveList from './MoveList'

const testDeck = {
  id: 'T1',
  name: 'Test Deck',
  moves: [
    { text: 'Move Alpha', partner: 'A' },
    { text: 'Move Beta', partner: 'B' },
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

function clickMoveLabel(text) {
  const btn = screen.getByRole('button', { name: text })
  fireEvent.click(btn)
}

describe('MoveList', () => {
  it('shows note text when move has notes', () => {
    renderList()
    clickMoveLabel('Move Alpha')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Alpha coaching note')).toBeInTheDocument()
    expect(document.querySelector('.popover-backdrop')).toBeInTheDocument()
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
    fireEvent.mouseDown(document.querySelector('.popover-backdrop'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
