import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('AGENTS는 선택 Method와 네 Project Source만 bootstrap한다', async () => {
  const agents = await read('AGENTS.md')
  assert.match(agents, /\.ai\/methods\/product-goal-loop\/METHOD\.md/)
  assert.match(agents, /Product Source: `PRODUCT_GOAL\.html`/)
  assert.match(agents, /Engineering Source: `ARCHITECTURE\.md`/)
  assert.match(agents, /Human Feedback: `INBOX\.md`/)
  assert.match(agents, /Derived Loop State: `STATE\.md`/)
  assert.match(agents, /Do not automatically read or apply sibling Methods/)
  assert.doesNotMatch(agents, /Loop Runtime Contract|Autonomous Development Loop/)
})

test('vendored Product Goal Loop Method는 설치한 canonical Git blob과 일치한다', async () => {
  const method = await read('.ai/methods/product-goal-loop/METHOD.md')
  const bytes = Buffer.from(method)
  const gitBlob = createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex')
  assert.equal(gitBlob, '82d9c1977f07237a462e1cfdcba75033c6fd2fcb')
})

test('Product Goal은 단일 semantic HTML source이며 실행 코드나 외부 asset에 의존하지 않는다', async () => {
  const goal = await read('PRODUCT_GOAL.html')
  const ids = [...goal.matchAll(/<article class="requirement" id="(PG-\d{3})">/g)].map(
    (match) => match[1],
  )
  assert.deepEqual(ids, [
    'PG-001',
    'PG-002',
    'PG-003',
    'PG-004',
    'PG-005',
    'PG-006',
    'PG-007',
    'PG-008',
    'PG-009',
    'PG-010',
    'PG-011',
  ])
  assert.doesNotMatch(goal, /<script\b/i)
  assert.doesNotMatch(goal, /<link\b/i)
  assert.doesNotMatch(goal, /@import|url\(/i)
  assert.match(goal, /<table>/)
  assert.match(goal, /<figure class="mockup">/)
})

test('Engineering, Inbox와 State source는 책임과 runtime vocabulary를 명시한다', async () => {
  const [architecture, inbox, state] = await Promise.all([
    read('ARCHITECTURE.md'),
    read('INBOX.md'),
    read('STATE.md'),
  ])
  assert.match(architecture, /## Module Boundaries/)
  assert.match(architecture, /## Dependency Direction/)
  assert.match(architecture, /## State Ownership and Data Flow/)
  assert.match(architecture, /## Testing and Verification Direction/)
  assert.match(inbox, /## Pending\s+\n+- /)
  assert.doesNotMatch(inbox, /## (?:Completed|Tasks|Backlog)/)
  assert.match(
    state,
    /`(?:RUNNING|WAITING_FOR_HUMAN|EXTERNALLY_BLOCKED|IMPLEMENTATION_COMPLETE)`/,
  )
})
