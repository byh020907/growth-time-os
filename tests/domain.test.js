import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertBoardInvariants,
  buildQuickCardDraft,
  completeNowCard,
  createCardChain,
  createEmptyState,
  createProject,
  defaultTodoProjectInput,
  ENTRY_MODE,
  getBoardCapacity,
  getNextCards,
  getNowCard,
  getWeeklySummary,
  handoffNowCard,
  moveNextCard,
  resumeWaitingCard,
  startNowCard,
  waitNowCard,
} from '../src/domain.js'

const projectInput = (name = '토익 8주 계획') => ({
  name,
  completionDefinition: '실전 모의고사 6회와 오답 재풀이가 완료된다',
  deadline: '2026-09-30',
  qualityCriteria: '오답 재풀이 정답률 85%를 달성한다',
  defaultContext: '평일 저녁 / 내 책상',
  defaultSessionMinutes: 50,
})

const draft = (title) => ({
  title,
  executionContext: '평일 저녁 / 내 책상',
  resumeLocation: `오답노트 / ${title}`,
  previousResult: '앞 카드 결과',
  firstAction: `${title} 범위의 첫 문제를 정답을 가리고 푼다`,
  completionCriteria: `${title} 풀이와 채점 기록이 존재한다`,
  verificationMethod: `${title} 정답률을 확인한다`,
  detourAction: `${title} 해설의 핵심 규칙을 한 문장으로 적는다`,
  expectedMinutes: 50,
})

const stateWithProject = (name) => {
  const created = createProject(createEmptyState(), projectInput(name), '2026-08-30T00:00:00.000Z')
  return created
}

test('첫 카드 사슬은 NOW 1장과 순서가 있는 NEXT 최대 3장을 만든다', () => {
  const { state, projectId } = stateWithProject()
  const result = createCardChain(
    state,
    projectId,
    [draft('진단 문제 풀이'), draft('오답 원인 분류'), draft('약점 유형 연습'), draft('주간 미니 테스트')],
    '2026-08-30T01:00:00.000Z',
  )

  assert.equal(getNowCard(result).title, '진단 문제 풀이')
  assert.deepEqual(getNextCards(result).map((card) => card.title), ['오답 원인 분류', '약점 유형 연습', '주간 미니 테스트'])
  assert.deepEqual(getNextCards(result).map((card) => card.order), [1, 2, 3])
  assert.equal(result.runs.length, 1)
  assert.equal(getBoardCapacity(result), 0)
  assert.doesNotThrow(() => assertBoardInvariants(result))
})

test('빠른 Todo는 제목 한 줄로 canonical 기본값을 만들고 NOW/NEXT에 연결된다', () => {
  const created = createProject(
    createEmptyState(),
    defaultTodoProjectInput(),
    '2026-08-31T00:00:00.000Z',
  )
  const project = created.state.projects[0]
  let board = createCardChain(
    created.state,
    created.projectId,
    [buildQuickCardDraft(project, '  Part 5 오답 12개 풀기  ')],
    '2026-08-31T00:01:00.000Z',
  )
  const now = getNowCard(board)
  assert.equal(now.title, 'Part 5 오답 12개 풀기')
  assert.equal(now.entryMode, ENTRY_MODE.QUICK)
  assert.equal(now.firstAction, now.title)
  assert.equal(now.resumeLocation, '별도 위치 없음')
  assert.equal(now.previousResult, '새 할 일')
  assert.equal(now.completionCriteria, `${now.title} 완료`)

  board = createCardChain(
    board,
    created.projectId,
    [buildQuickCardDraft(project, '단어 30개 복습')],
    '2026-08-31T00:02:00.000Z',
  )
  assert.equal(getNowCard(board).title, 'Part 5 오답 12개 풀기')
  assert.deepEqual(getNextCards(board).map((card) => card.title), ['단어 30개 복습'])
  assert.doesNotThrow(() => assertBoardInvariants(board))
})

test('빠른 Todo도 같은 canonical 완료·계속·대기 transition을 사용한다', () => {
  const created = createProject(createEmptyState(), defaultTodoProjectInput())
  const project = created.state.projects[0]
  let board = createCardChain(
    created.state,
    created.projectId,
    [buildQuickCardDraft(project, '오답 3개 풀기'), buildQuickCardDraft(project, '단어 10개 보기')],
  )
  const first = getNowCard(board)
  board = handoffNowCard(board, first.id, first, 0)
  assert.equal(getNowCard(board).id, first.id)
  assert.ok(board.runs[0].startedAt)
  assert.equal(board.runs.at(-1).outcome, 'ACTIVE')

  board = completeNowCard(board, first.id, '완료 표시', 0)
  assert.equal(getNowCard(board).title, '단어 10개 보기')
  const second = getNowCard(board)
  board = waitNowCard(board, second.id, {
    reason: '단어장 도착',
    waitingFor: '단어장 도착',
    reviewDate: '',
    focusMinutes: 0,
  })
  assert.equal(getNowCard(board), undefined)
  assert.equal(board.cards.find((card) => card.id === second.id).status, 'WAITING')
})

test('전역 NEXT 용량을 넘는 카드와 빈 필수 필드를 거부한다', () => {
  const { state, projectId } = stateWithProject()
  assert.throws(
    () => createCardChain(state, projectId, Array.from({ length: 5 }, (_, index) => draft(`카드 ${index}`))),
    /카드 4장만/,
  )
  assert.throws(
    () => createCardChain(state, projectId, [{ ...draft('잘못된 카드'), firstAction: '' }]),
    /첫 행동/,
  )
})

test('여러 프로젝트도 하나의 전역 실행 순서를 공유한다', () => {
  const first = stateWithProject('주력')
  const second = createProject(first.state, projectInput('유지'), '2026-08-30T00:10:00.000Z')
  let state = createCardChain(second.state, first.projectId, [draft('주력 NOW'), draft('주력 NEXT')])
  state = createCardChain(state, second.projectId, [draft('유지 NEXT')])

  assert.equal(getNowCard(state).projectId, first.projectId)
  assert.deepEqual(getNextCards(state).map((card) => card.projectId), [first.projectId, second.projectId])
})

test('완료는 증거를 저장하고 정확히 첫 NEXT를 NOW로 원자 승격한다', () => {
  const { state, projectId } = stateWithProject()
  let board = createCardChain(state, projectId, [draft('첫 카드'), draft('둘째 카드'), draft('셋째 카드')])
  const firstId = getNowCard(board).id
  board = startNowCard(board, firstId, '2026-08-30T01:05:00.000Z')
  board = completeNowCard(board, firstId, '재풀이 12개 채점 완료', 42, '2026-08-30T01:47:00.000Z')

  const done = board.cards.find((card) => card.id === firstId)
  assert.equal(done.status, 'DONE')
  assert.equal(done.completionEvidence, '재풀이 12개 채점 완료')
  assert.equal(getNowCard(board).title, '둘째 카드')
  assert.deepEqual(getNextCards(board).map((card) => [card.title, card.order]), [['셋째 카드', 1]])
  assert.equal(board.runs.find((run) => run.cardId === firstId).focusMinutes, 42)
})

test('완료 증거가 없으면 전이하지 않고, 이전 카드 id의 중복 완료도 새 NOW에 적용하지 않는다', () => {
  const { state, projectId } = stateWithProject()
  const board = createCardChain(state, projectId, [draft('첫 카드'), draft('둘째 카드')])
  const firstId = getNowCard(board).id
  assert.throws(() => completeNowCard(board, firstId, '   ', 10), /완료 증거/)

  const completed = completeNowCard(board, firstId, '증거', 10)
  const promotedId = getNowCard(completed).id
  assert.throws(() => completeNowCard(completed, firstId, '중복 증거', 10), /변경/)
  assert.equal(getNowCard(completed).id, promotedId)
})

test('우회도 불가능한 NOW는 WAITING으로 이동하고 첫 NEXT를 승격한다', () => {
  const { state, projectId } = stateWithProject()
  const board = createCardChain(state, projectId, [draft('피드백 반영'), draft('최종 검사')])
  const currentId = getNowCard(board).id
  const result = waitNowCard(
    board,
    currentId,
    { reason: '검토 의견이 필요함', waitingFor: '멘토 피드백', reviewDate: '2026-09-02', focusMinutes: 15 },
    '2026-08-30T02:00:00.000Z',
  )

  const waiting = result.cards.find((card) => card.id === currentId)
  assert.equal(waiting.status, 'WAITING')
  assert.equal(waiting.waitingFor, '멘토 피드백')
  assert.equal(getNowCard(result).title, '최종 검사')
  assert.equal(result.runs.find((run) => run.cardId === currentId).outcome, 'WAITING')
})

test('NEXT가 없으면 완료 뒤 NOW가 비어 있고, 대기 해제 카드는 NOW로 복귀한다', () => {
  const { state, projectId } = stateWithProject()
  const single = createCardChain(state, projectId, [draft('단일 완료')])
  const completed = completeNowCard(single, getNowCard(single).id, '완료 증거', 20)
  assert.equal(getNowCard(completed), undefined)

  let board = createCardChain(state, projectId, [draft('외부 자료 확인')])
  const cardId = getNowCard(board).id
  board = waitNowCard(board, cardId, { reason: '자료 미도착', waitingFor: '기관 답변', focusMinutes: 5 })
  assert.equal(getNowCard(board), undefined)
  board = resumeWaitingCard(board, cardId, '2026-08-31T03:00:00.000Z')
  assert.equal(getNowCard(board).id, cardId)
  assert.equal(board.runs.filter((run) => run.cardId === cardId).length, 2)
})

test('WAITING 복귀는 NOW가 있으면 NEXT 꼬리로 가고 NEXT가 차면 거부한다', () => {
  const { state, projectId } = stateWithProject()
  let board = createCardChain(state, projectId, [draft('대기 1'), draft('대기 2'), draft('실행 A'), draft('실행 B')])
  const waitingOneId = getNowCard(board).id
  board = waitNowCard(board, waitingOneId, { reason: '답변 필요', waitingFor: '담당자 1', focusMinutes: 1 })
  const waitingTwoId = getNowCard(board).id
  board = waitNowCard(board, waitingTwoId, { reason: '또 답변 필요', waitingFor: '담당자 2', focusMinutes: 1 })

  board = resumeWaitingCard(board, waitingOneId)
  assert.deepEqual(getNextCards(board).map((card) => card.title), ['실행 B', '대기 1'])

  const full = createCardChain(board, projectId, [draft('실행 C')])
  assert.equal(getNextCards(full).length, 3)
  assert.throws(() => resumeWaitingCard(full, waitingTwoId), /NEXT가 가득/)
})

test('NEXT 순서 이동은 상대 순서와 1부터 시작하는 순서를 유지한다', () => {
  const { state, projectId } = stateWithProject()
  const board = createCardChain(state, projectId, [draft('NOW'), draft('A'), draft('B'), draft('C')])
  const b = getNextCards(board)[1]
  const moved = moveNextCard(board, b.id, -1, '2026-08-30T05:00:00.000Z')
  assert.deepEqual(getNextCards(moved).map((card) => card.title), ['B', 'A', 'C'])
  assert.deepEqual(getNextCards(moved).map((card) => card.order), [1, 2, 3])
})

test('시작 기록은 멱등이고 7일 요약은 실행 기회·산출물·집중시간을 집계한다', () => {
  const { state, projectId } = stateWithProject()
  let board = createCardChain(state, projectId, [draft('첫 카드'), draft('둘째 카드')], '2026-08-28T01:00:00.000Z')
  const firstId = getNowCard(board).id
  board = startNowCard(board, firstId, '2026-08-28T01:01:00.000Z')
  board = startNowCard(board, firstId, '2026-08-28T01:02:00.000Z')
  assert.equal(board.runs.filter((run) => run.cardId === firstId && run.startedAt).length, 1)
  assert.equal(board.runs.find((run) => run.cardId === firstId).startedAt, '2026-08-28T01:01:00.000Z')
  board = completeNowCard(board, firstId, '산출물', 35, '2026-08-28T01:36:00.000Z')

  assert.deepEqual(getWeeklySummary(board, new Date('2026-08-30T12:00:00.000Z')), {
    opportunities: 2,
    starts: 1,
    startRate: 50,
    completedOutputs: 1,
    waitingTransitions: 0,
    focusMinutes: 35,
  })
})

test('미완료 인계는 같은 NOW를 유지하며 기존 실행을 닫고 새 실행 기회를 연다', () => {
  const { state, projectId } = stateWithProject()
  let board = createCardChain(state, projectId, [draft('긴 카드')], '2026-08-20T01:00:00.000Z')
  const cardId = getNowCard(board).id
  board = startNowCard(board, cardId, '2026-08-30T01:00:00.000Z')
  board = handoffNowCard(
    board,
    cardId,
    { ...draft('남은 부분'), previousResult: '첫 절반 완료' },
    25,
    '2026-08-30T01:25:00.000Z',
  )

  assert.equal(getNowCard(board).id, cardId)
  assert.equal(getNowCard(board).title, '남은 부분')
  const runs = board.runs.filter((run) => run.cardId === cardId)
  assert.equal(runs.length, 2)
  assert.equal(runs[0].outcome, 'INCOMPLETE')
  assert.equal(runs[0].focusMinutes, 25)
  assert.equal(runs[1].outcome, 'ACTIVE')
  assert.equal(runs[1].startedAt, undefined)
  assert.deepEqual(getWeeklySummary(board, new Date('2026-08-30T12:00:00.000Z')), {
    opportunities: 2,
    starts: 1,
    startRate: 50,
    completedOutputs: 0,
    waitingTransitions: 0,
    focusMinutes: 25,
  })
})

test('7일 넘게 유지한 NOW도 오늘 완료하면 이번 7일 산출물과 집중시간에 포함된다', () => {
  const { state, projectId } = stateWithProject()
  const board = createCardChain(state, projectId, [draft('오래 유지한 카드')], '2026-08-01T01:00:00.000Z')
  const cardId = getNowCard(board).id
  const completed = completeNowCard(
    board,
    cardId,
    '오늘 완료한 증거',
    30,
    '2026-08-30T02:00:00.000Z',
  )
  const summary = getWeeklySummary(completed, new Date('2026-08-30T12:00:00.000Z'))
  assert.equal(summary.opportunities, 1)
  assert.equal(summary.completedOutputs, 1)
  assert.equal(summary.focusMinutes, 30)
})
