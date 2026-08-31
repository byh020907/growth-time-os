import { assertBoardInvariants, createEmptyState } from './domain.js'

export const STORAGE_KEY = 'growth-time-os:v1'

export const loadState = (storage = localStorage) => {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyState()
    const parsed = JSON.parse(raw)
    const state = {
      ...parsed,
      cards: Array.isArray(parsed.cards)
        ? parsed.cards.map((card) => ({ ...card, entryMode: card.entryMode ?? 'DETAILED' }))
        : parsed.cards,
    }
    return assertBoardInvariants(state)
  } catch {
    return createEmptyState()
  }
}

export const saveState = (state, storage = localStorage) => {
  assertBoardInvariants(state)
  storage.setItem(STORAGE_KEY, JSON.stringify(state))
}
