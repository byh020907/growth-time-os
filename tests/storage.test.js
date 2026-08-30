import assert from 'node:assert/strict'
import test from 'node:test'
import { createCardChain, createEmptyState, createProject, getNowCard } from '../src/domain.js'
import { loadState, saveState, STORAGE_KEY } from '../src/storage.js'

class MemoryStorage {
  values = new Map()
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, value) }
}

const project = {
  name: '토익',
  completionDefinition: '모의고사 6회 완료',
  deadline: '',
  qualityCriteria: '재풀이 정답률 85%',
  defaultContext: '토요일 오전 / 책상',
  defaultSessionMinutes: 50,
}

const card = {
  title: 'Part 5 오답 12개 재풀이',
  executionContext: '토요일 오전 / 책상',
  resumeLocation: '오답노트 / 문제 1~12',
  previousResult: '어휘 오답 5개',
  firstAction: '정답을 가리고 1번부터 푼다',
  completionCriteria: '12개 재풀이와 원인 태그 완료',
  verificationMethod: '재풀이 정답률 기록',
  detourAction: '해설 규칙 한 문장과 유사문제 1개 풀이',
  expectedMinutes: 50,
}

test('저장 후 다시 읽어도 NOW와 실행 순서가 그대로 유지된다', () => {
  const storage = new MemoryStorage()
  const created = createProject(createEmptyState(), project, '2026-08-20T00:00:00.000Z')
  const state = createCardChain(created.state, created.projectId, [card], '2026-08-20T01:00:00.000Z')
  saveState(state, storage)

  const loaded = loadState(storage)
  assert.deepEqual(loaded, state)
  assert.equal(getNowCard(loaded).title, card.title)
})

test('날짜 경과만으로 저장된 NOW는 변하지 않는다', () => {
  const storage = new MemoryStorage()
  const created = createProject(createEmptyState(), project, '2026-08-20T00:00:00.000Z')
  const state = createCardChain(created.state, created.projectId, [card], '2026-08-20T01:00:00.000Z')
  saveState(state, storage)
  const firstLoad = loadState(storage)
  const secondLoad = loadState(storage)
  assert.equal(getNowCard(firstLoad).id, getNowCard(secondLoad).id)
  assert.equal(getNowCard(secondLoad).updatedAt, '2026-08-20T01:00:00.000Z')
})

test('손상되거나 불변조건을 위반한 로컬 데이터는 안전한 빈 상태로 복구한다', () => {
  const storage = new MemoryStorage()
  storage.setItem(STORAGE_KEY, '{broken')
  assert.deepEqual(loadState(storage), createEmptyState())

  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 1, projects: [], cards: [{ id: 'orphan', projectId: 'missing', status: 'NOW' }], runs: [] }),
  )
  assert.deepEqual(loadState(storage), createEmptyState())
})

test('의미상 불완전한 DONE·WAITING·ACTIVE 기록도 빈 상태로 복구한다', () => {
  const storage = new MemoryStorage()
  const projectRecord = { id: 'p1', ...project, createdAt: '2026-08-20T00:00:00.000Z' }
  const baseCard = { id: 'c1', projectId: 'p1', ...card, order: 0, createdAt: '2026-08-20T01:00:00.000Z', updatedAt: '2026-08-20T01:00:00.000Z' }

  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, projects: [projectRecord], cards: [{ ...baseCard, status: 'DONE' }], runs: [] }))
  assert.deepEqual(loadState(storage), createEmptyState())

  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, projects: [projectRecord], cards: [{ ...baseCard, status: 'WAITING', blockedReason: '', waitingFor: '' }], runs: [] }))
  assert.deepEqual(loadState(storage), createEmptyState())

  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, projects: [projectRecord], cards: [{ ...baseCard, status: 'NOW' }], runs: [] }))
  assert.deepEqual(loadState(storage), createEmptyState())
})
