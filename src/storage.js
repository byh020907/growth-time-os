import { assertBoardInvariants, createEmptyState } from './domain.js'

export const STORAGE_KEY = 'growth-time-os:v1'

export const loadState = (storage = localStorage) => {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyState()
    const state = JSON.parse(raw)
    return assertBoardInvariants(state)
  } catch {
    return createEmptyState()
  }
}

export const saveState = (state, storage = localStorage) => {
  assertBoardInvariants(state)
  storage.setItem(STORAGE_KEY, JSON.stringify(state))
}
