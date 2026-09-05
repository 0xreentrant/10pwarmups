export type Partner = 'A' | 'B'

export interface Move {
  text: string
  players: Partner[]
}

export interface Series {
  id: string
  name: string
}

export interface Deck {
  id: string
  series?: string
  name: string
  link?: string
  moves: Move[]
  notes?: Record<number, string>
}

export interface MoveAnswer {
  moveIndex: number
  correct: boolean
}

export interface QuestionOption {
  text: string
  correct: boolean
  players?: Partner[]
}

export interface Attempt {
  date: string
  finalStreak: number
  wrongMoves: number[]
  duration: number
  abandoned?: boolean
}

export interface DeckProgress {
  bestStreak: number
  lastAttemptDate: string | null
  attempts: Attempt[]
}

export type ProgressMap = Record<string, DeckProgress>

export interface Session {
  moveSequence: MoveAnswer[]
  /** Deck move indices asked in order; omits untagged moves when timestamps are partial. */
  moveOrder: number[]
  currentStreak: number
  startTime: number
  pausedAt: number | null
  accumulatedPauseMs: number
  allOptions: QuestionOption[][]
  options: QuestionOption[]
  locked: boolean
  finalAttempt?: Attempt
}
