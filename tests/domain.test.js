import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertBoardInvariants,
  completeNowCard,
  createCardChain,
  createEmptyState,
  createProject,
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

const projectInput = (name = '개발 포트폴리오') => ({
  name,
  completionDefinition: '작은 앱과 README가 존재한다',
  deadline: '2026-09-30',
  qualityCriteria: '전체 테스트가 통과한다',
  defaultContext: '평일 저녁 / 내 책상',
  defaultSessionMinutes: 50,
})

const draft = (title) => ({
  title,
  executionContext: '평일 저녁 / 내 책상',
  resumeLocation: `work/${title}.md`,
  previousResult: '앞 카드 결과',
  firstAction: `${title} 파일을 연다`,
  completionCriteria: `${title} 결과가 존재한다`,
  verificationMethod: `${title} 결과를 직접 확인한다`,
  detourAction: `${title}의 막힌 입력과 오류를 기록한다`,
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
    [draft('완료 조건 작성'), draft('최소 구현'), draft('테스트'), draft('수정')],
    '2026-08-30T01:00:00.000Z',
  )

  assert.equal(getNowCard(result).title, '완료 조건 작성')
  assert.deepEqual(getNextCards(result).map((card) => card.title), ['최소 구현', '테스트', '수정'])
  assert.deepEqual(getNextCards(result).map((card) => card.order), [1, 2, 3])
  assert.equal(result.runs.length, 1)
  assert.equal(getBoardCapacity(result), 0)
  assert.doesNotThrow(() => assertBoardInvariants(result))
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
  board = completeNowCard(board, firstId, '테스트 12개 통과', 42, '2026-08-30T01:47:00.000Z')

  const done = board.cards.find((card) => card.id === firstId)
  assert.equal(done.status, 'DONE')
  assert.equal(done.completionEvidence, '테스트 12개 통과')
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
