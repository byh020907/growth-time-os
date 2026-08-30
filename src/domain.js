export const CARD_STATUS = Object.freeze({
  NOW: 'NOW',
  NEXT: 'NEXT',
  WAITING: 'WAITING',
  DONE: 'DONE',
})

export const createEmptyState = () => ({
  version: 1,
  projects: [],
  cards: [],
  runs: [],
})

const id = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
const isoNow = () => new Date().toISOString()

const required = (value, label) => {
  if (!String(value ?? '').trim()) throw new Error(`${label}을(를) 입력해 주세요.`)
}

const nonNegativeMinutes = (value, label) => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label}은(는) 0분 이상이어야 합니다.`)
}

export const getNowCard = (state) => state.cards.find((card) => card.status === CARD_STATUS.NOW)

export const getNextCards = (state) =>
  state.cards
    .filter((card) => card.status === CARD_STATUS.NEXT)
    .sort((a, b) => a.order - b.order)

export const getBoardCapacity = (state) =>
  (getNowCard(state) ? 0 : 1) + (3 - getNextCards(state).length)

export const assertBoardInvariants = (state) => {
  if (!state || state.version !== 1) throw new Error('지원하지 않는 데이터 형식입니다.')
  if (!Array.isArray(state.projects) || !Array.isArray(state.cards) || !Array.isArray(state.runs)) {
    throw new Error('저장 데이터 구조가 올바르지 않습니다.')
  }
  const nowCount = state.cards.filter((card) => card.status === CARD_STATUS.NOW).length
  const next = getNextCards(state)
  if (nowCount > 1) throw new Error('NOW 카드는 한 장만 허용됩니다.')
  if (next.length > 3) throw new Error('NEXT 카드는 최대 세 장만 허용됩니다.')
  if (new Set(next.map((card) => card.order)).size !== next.length) {
    throw new Error('NEXT 카드 순서가 중복되었습니다.')
  }
  if (next.some((card, index) => card.order !== index + 1)) {
    throw new Error('NEXT 카드 순서는 1부터 끊김없이 이어져야 합니다.')
  }
  const validStatuses = new Set(Object.values(CARD_STATUS))
  if (state.cards.some((card) => !validStatuses.has(card.status))) {
    throw new Error('알 수 없는 카드 상태가 있습니다.')
  }
  const projectIds = new Set(state.projects.map((project) => project.id))
  if (projectIds.size !== state.projects.length) throw new Error('프로젝트 ID가 중복되었습니다.')
  const cardIds = new Set(state.cards.map((card) => card.id))
  if (cardIds.size !== state.cards.length) throw new Error('카드 ID가 중복되었습니다.')
  if (state.cards.some((card) => !projectIds.has(card.projectId))) {
    throw new Error('프로젝트가 없는 카드가 있습니다.')
  }
  if (
    state.cards.some(
      (card) =>
        card.status === CARD_STATUS.DONE &&
        (!String(card.completionEvidence ?? '').trim() || !card.completedAt),
    )
  ) {
    throw new Error('DONE 카드에는 완료 증거와 완료 시각이 필요합니다.')
  }
  if (
    state.cards.some(
      (card) =>
        card.status === CARD_STATUS.WAITING &&
        (!String(card.blockedReason ?? '').trim() || !String(card.waitingFor ?? '').trim()),
    )
  ) {
    throw new Error('WAITING 카드에는 막힌 이유와 기다리는 대상이 필요합니다.')
  }
  const runIds = new Set(state.runs.map((run) => run.id))
  if (runIds.size !== state.runs.length) throw new Error('실행 기록 ID가 중복되었습니다.')
  if (
    state.runs.some(
      (run) => !cardIds.has(run.cardId) || !projectIds.has(run.projectId),
    )
  ) {
    throw new Error('카드나 프로젝트가 없는 실행 기록이 있습니다.')
  }
  const activeRuns = state.runs.filter((run) => run.outcome === 'ACTIVE')
  const nowCard = getNowCard(state)
  if (
    (nowCard && (activeRuns.length !== 1 || activeRuns[0].cardId !== nowCard.id)) ||
    (!nowCard && activeRuns.length !== 0)
  ) {
    throw new Error('NOW 카드와 활성 실행 기록이 일치하지 않습니다.')
  }
  return state
}

export const createProject = (state, input, now = isoNow()) => {
  required(input.name, '프로젝트 이름')
  required(input.completionDefinition, '프로젝트 완료 상태')
  required(input.qualityCriteria, '완료 판단 기준')
  required(input.defaultContext, '기본 실행 시점/장소')
  if (!Number.isFinite(input.defaultSessionMinutes) || input.defaultSessionMinutes < 1) {
    throw new Error('기본 세션은 1분 이상이어야 합니다.')
  }
  const project = {
    id: id(),
    name: input.name.trim(),
    completionDefinition: input.completionDefinition.trim(),
    deadline: input.deadline ?? '',
    qualityCriteria: input.qualityCriteria.trim(),
    defaultContext: input.defaultContext.trim(),
    defaultSessionMinutes: input.defaultSessionMinutes,
    createdAt: now,
  }
  return {
    state: { ...state, projects: [...state.projects, project] },
    projectId: project.id,
  }
}

const validateDraft = (draft) => {
  required(draft.title, '카드 제목')
  required(draft.resumeLocation, '이어받을 위치')
  required(draft.previousResult, '직전 결과')
  required(draft.firstAction, '첫 행동')
  required(draft.completionCriteria, '완료 조건')
  required(draft.verificationMethod, '검증 방법')
  required(draft.detourAction, '우회 행동')
  if (!Number.isFinite(draft.expectedMinutes) || draft.expectedMinutes < 1) {
    throw new Error('예상 세션은 1분 이상이어야 합니다.')
  }
}

const newRun = (card, now) => ({
  id: id(),
  cardId: card.id,
  projectId: card.projectId,
  activatedAt: now,
  outcome: 'ACTIVE',
  focusMinutes: 0,
})

export const createCardChain = (state, projectId, drafts, now = isoNow()) => {
  if (!state.projects.some((project) => project.id === projectId)) {
    throw new Error('카드를 연결할 프로젝트를 찾을 수 없습니다.')
  }
  if (!drafts.length) throw new Error('카드를 한 장 이상 만들어 주세요.')
  drafts.forEach(validateDraft)
  const capacity = getBoardCapacity(state)
  if (drafts.length > capacity) {
    throw new Error(`현재 보드에는 카드 ${capacity}장만 더 연결할 수 있습니다.`)
  }

  let nowAssigned = Boolean(getNowCard(state))
  let nextOrder = getNextCards(state).length
  const cards = drafts.map((draft) => {
    const status = nowAssigned ? CARD_STATUS.NEXT : CARD_STATUS.NOW
    if (status === CARD_STATUS.NOW) nowAssigned = true
    else nextOrder += 1
    return {
      ...draft,
      title: draft.title.trim(),
      executionContext: draft.executionContext.trim(),
      resumeLocation: draft.resumeLocation.trim(),
      previousResult: draft.previousResult.trim(),
      firstAction: draft.firstAction.trim(),
      completionCriteria: draft.completionCriteria.trim(),
      verificationMethod: draft.verificationMethod.trim(),
      detourAction: draft.detourAction.trim(),
      id: id(),
      projectId,
      status,
      order: status === CARD_STATUS.NEXT ? nextOrder : 0,
      createdAt: now,
      updatedAt: now,
    }
  })
  const firstNow = cards.find((card) => card.status === CARD_STATUS.NOW)
  const result = {
    ...state,
    cards: [...state.cards, ...cards],
    runs: firstNow ? [...state.runs, newRun(firstNow, now)] : state.runs,
  }
  return assertBoardInvariants(result)
}

const promoteNext = (state, now) => {
  const [first, ...rest] = getNextCards(state)
  if (!first) return state
  const remainingOrder = new Map(rest.map((card, index) => [card.id, index + 1]))
  const promoted = { ...first, status: CARD_STATUS.NOW, order: 0, updatedAt: now }
  return {
    ...state,
    cards: state.cards.map((card) => {
      if (card.id === first.id) return promoted
      if (card.status === CARD_STATUS.NEXT) {
        return { ...card, order: remainingOrder.get(card.id), updatedAt: now }
      }
      return card
    }),
    runs: [...state.runs, newRun(promoted, now)],
  }
}

const closeActiveRun = (state, cardId, update, now) => {
  let found = false
  const runs = state.runs.map((run) => {
    if (run.cardId === cardId && run.outcome === 'ACTIVE') {
      found = true
      return { ...run, ...update, endedAt: now }
    }
    return run
  })
  if (!found) throw new Error('현재 카드의 실행 기록을 찾을 수 없습니다.')
  return { ...state, runs }
}

export const startNowCard = (state, cardId, now = isoNow()) => {
  const current = getNowCard(state)
  if (!current || current.id !== cardId) throw new Error('현재 NOW 카드가 변경되었습니다.')
  return {
    ...state,
    runs: state.runs.map((run) =>
      run.cardId === cardId && run.outcome === 'ACTIVE' && !run.startedAt
        ? { ...run, startedAt: now }
        : run,
    ),
  }
}

export const completeNowCard = (state, cardId, evidence, focusMinutes, now = isoNow()) => {
  required(evidence, '완료 증거')
  nonNegativeMinutes(focusMinutes, '집중 시간')
  const current = getNowCard(state)
  if (!current || current.id !== cardId) throw new Error('현재 NOW 카드가 변경되었습니다.')
  const cards = state.cards.map((card) =>
    card.id === cardId
      ? {
          ...card,
          status: CARD_STATUS.DONE,
          completionEvidence: evidence.trim(),
          completedAt: now,
          updatedAt: now,
        }
      : card,
  )
  let result = closeActiveRun(
    { ...state, cards },
    cardId,
    { outcome: 'DONE', evidence: evidence.trim(), focusMinutes },
    now,
  )
  result = promoteNext(result, now)
  return assertBoardInvariants(result)
}

export const waitNowCard = (state, cardId, input, now = isoNow()) => {
  required(input.reason, '막힌 이유')
  required(input.waitingFor, '기다리는 대상')
  nonNegativeMinutes(input.focusMinutes, '집중 시간')
  const current = getNowCard(state)
  if (!current || current.id !== cardId) throw new Error('현재 NOW 카드가 변경되었습니다.')
  const cards = state.cards.map((card) =>
    card.id === cardId
      ? {
          ...card,
          status: CARD_STATUS.WAITING,
          order: 0,
          blockedReason: input.reason.trim(),
          waitingFor: input.waitingFor.trim(),
          reviewDate: input.reviewDate ?? '',
          updatedAt: now,
        }
      : card,
  )
  let result = closeActiveRun(
    { ...state, cards },
    cardId,
    { outcome: 'WAITING', blockedReason: input.reason.trim(), focusMinutes: input.focusMinutes },
    now,
  )
  result = promoteNext(result, now)
  return assertBoardInvariants(result)
}

export const resumeWaitingCard = (state, cardId, now = isoNow()) => {
  const waiting = state.cards.find(
    (card) => card.id === cardId && card.status === CARD_STATUS.WAITING,
  )
  if (!waiting) throw new Error('대기 중인 카드를 찾을 수 없습니다.')
  const hasNow = Boolean(getNowCard(state))
  const queue = getNextCards(state)
  if (hasNow && queue.length >= 3) {
    throw new Error('NEXT가 가득 찼습니다. 순서가 비워진 뒤 다시 연결해 주세요.')
  }
  const status = hasNow ? CARD_STATUS.NEXT : CARD_STATUS.NOW
  const resumed = {
    ...waiting,
    status,
    order: status === CARD_STATUS.NEXT ? queue.length + 1 : 0,
    resumedAt: now,
    updatedAt: now,
  }
  const result = {
    ...state,
    cards: state.cards.map((card) => (card.id === cardId ? resumed : card)),
    runs: status === CARD_STATUS.NOW ? [...state.runs, newRun(resumed, now)] : state.runs,
  }
  return assertBoardInvariants(result)
}

export const updateCardDetails = (state, cardId, draft, now = isoNow()) => {
  validateDraft(draft)
  if (!state.cards.some((card) => card.id === cardId)) throw new Error('수정할 카드를 찾을 수 없습니다.')
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId
        ? {
            ...card,
            ...draft,
            title: draft.title.trim(),
            executionContext: draft.executionContext.trim(),
            resumeLocation: draft.resumeLocation.trim(),
            previousResult: draft.previousResult.trim(),
            firstAction: draft.firstAction.trim(),
            completionCriteria: draft.completionCriteria.trim(),
            verificationMethod: draft.verificationMethod.trim(),
            detourAction: draft.detourAction.trim(),
            updatedAt: now,
          }
        : card,
    ),
  }
}

export const handoffNowCard = (
  state,
  cardId,
  draft,
  focusMinutes,
  now = isoNow(),
) => {
  nonNegativeMinutes(focusMinutes, '집중 시간')
  const current = getNowCard(state)
  if (!current || current.id !== cardId) throw new Error('현재 NOW 카드가 변경되었습니다.')
  let result = updateCardDetails(state, cardId, draft, now)
  result = closeActiveRun(
    result,
    cardId,
    { outcome: 'INCOMPLETE', focusMinutes },
    now,
  )
  const continued = result.cards.find((card) => card.id === cardId)
  result = { ...result, runs: [...result.runs, newRun(continued, now)] }
  return assertBoardInvariants(result)
}

export const moveNextCard = (state, cardId, direction, now = isoNow()) => {
  const queue = getNextCards(state)
  const index = queue.findIndex((card) => card.id === cardId)
  const swapIndex = index + direction
  if (index < 0 || swapIndex < 0 || swapIndex >= queue.length) return state
  const reordered = [...queue]
  ;[reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]]
  const orderById = new Map(reordered.map((card, position) => [card.id, position + 1]))
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.status === CARD_STATUS.NEXT
        ? { ...card, order: orderById.get(card.id), updatedAt: now }
        : card,
    ),
  }
}

export const getWeeklySummary = (state, now = new Date()) => {
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - 7)
  const inWindow = (value) => value && new Date(value) >= cutoff && new Date(value) <= now
  const runs = state.runs.filter(
    (run) => inWindow(run.activatedAt) || inWindow(run.startedAt) || inWindow(run.endedAt),
  )
  const starts = runs.filter((run) => inWindow(run.startedAt)).length
  const opportunities = runs.length
  return {
    opportunities,
    starts,
    startRate: opportunities ? Math.round((starts / opportunities) * 100) : 0,
    completedOutputs: runs.filter((run) => run.outcome === 'DONE' && inWindow(run.endedAt)).length,
    waitingTransitions: runs.filter((run) => run.outcome === 'WAITING' && inWindow(run.endedAt)).length,
    focusMinutes: runs.reduce(
      (sum, run) => sum + (inWindow(run.endedAt) ? run.focusMinutes : 0),
      0,
    ),
  }
}
