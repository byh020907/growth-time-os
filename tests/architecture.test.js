import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import test from 'node:test'

const components = [
  'app-header.js',
  'growth-time-app.js',
  'guided-entry-form.js',
  'now-card-view.js',
  'planning-view.js',
  'pwa-controller.js',
  'review-view.js',
]

test('화면 컴포넌트는 한 파일에 Shadow DOM 템플릿과 scoped CSS를 함께 둔다', async () => {
  for (const filename of components) {
    const source = await readFile(new URL(`../src/components/${filename}`, import.meta.url), 'utf8')
    assert.match(source, /attachShadow\(\{ mode: 'open' \}\)/, `${filename}: Shadow DOM 누락`)
    assert.match(source, /<style>/, `${filename}: 컴포넌트 CSS 누락`)
    assert.match(source, /innerHTML = `/, `${filename}: 컴포넌트 템플릿 누락`)
    assert.match(source, /customElements\.define/, `${filename}: Custom Element 등록 누락`)
  }
})

test('GitHub Pages 진입점은 빌드 산출물이 아닌 상대 ES Module을 직접 읽는다', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
  assert.match(html, /<script type="module" src="\.\/src\/main\.js"><\/script>/)
  assert.doesNotMatch(html, /\/dist\/|\/build\//)
})

test('유도 입력 컴포넌트는 한 질문씩 표시하고 다음 단계에 자동 포커스한다', async () => {
  const source = await readFile(new URL('../src/components/guided-entry-form.js', import.meta.url), 'utf8')
  assert.match(source, /steps\[this\.stepIndex\]/)
  assert.match(source, /requestAnimationFrame\(\(\) => control\.focus\(\)\)/)
  assert.match(source, /form\.requestSubmit\(\)/)
  assert.match(source, /guided-complete/)
})

test('동적으로 열린 NOW action form은 첫 입력으로 명시적으로 focus를 이동한다', async () => {
  const source = await readFile(
    new URL('../src/components/now-card-view.js', import.meta.url),
    'utf8',
  )
  assert.match(source, /requestAnimationFrame\(\(\) => slot\.querySelector\('\[autofocus\]'\)\?\.focus\(\)\)/)
})

test('Application Shell은 저장 성공 뒤에만 durable state를 publish하고 실패 시 draft view를 보존한다', async () => {
  const source = await readFile(
    new URL('../src/components/growth-time-app.js', import.meta.url),
    'utf8',
  )
  const savePosition = source.indexOf('saveState(next)')
  const publishPosition = source.indexOf('this.state = next')
  assert.ok(savePosition >= 0 && publishPosition > savePosition)
  assert.match(source, /catch \(error\) \{[\s\S]*this\.renderMessage\(\)/)
  assert.doesNotMatch(
    source.match(/catch \(error\) \{[\s\S]*?\n    \}/)?.[0] ?? '',
    /this\.render\(\)/,
  )
})

test('Quick capture는 Shell에서 default project와 Domain quick draft를 한 save 전에 조합한다', async () => {
  const source = await readFile(
    new URL('../src/components/growth-time-app.js', import.meta.url),
    'utf8',
  )
  assert.match(source, /'quick-add'/)
  assert.match(source, /quickAddTodo\(state, payload\)/)
  assert.match(source, /createProject\(state, defaultTodoProjectInput\(\)\)/)
  assert.match(source, /createCardChain\(next, project\.id, \[buildQuickCardDraft\(project, payload\.title\)\]\)/)
})

test('Todo-first UI는 한 줄 추가를 기본으로 두고 상세 입력을 접힌 선택 영역으로 내린다', async () => {
  const [planning, now] = await Promise.all([
    readFile(new URL('../src/components/planning-view.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/now-card-view.js', import.meta.url), 'utf8'),
  ])
  assert.match(planning, /id="quick-add-form"/)
  assert.match(planning, /placeholder="할 일 한 줄"/)
  assert.match(planning, /<details class="advanced-settings"/)
  assert.match(planning, /this\.showProjectForm = false/)
  assert.match(planning, /this\.showDetailedForm = false/)
  assert.match(now, /quick && button\.dataset\.mode === 'complete'/)
  assert.match(now, /evidence: '완료 표시'/)
  assert.match(now, /quick && button\.dataset\.mode === 'handoff'/)
  assert.match(now, /data-form="waiting-quick"/)
})

test('Domain과 UI는 persistence boundary를 우회하지 않는다', async () => {
  const sourceRoot = new URL('../src/', import.meta.url)
  const entries = await readdir(sourceRoot, { recursive: true, withFileTypes: true })
  const javascriptFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
  const storageUsers = []
  for (const entry of javascriptFiles) {
    const source = await readFile(`${entry.parentPath}/${entry.name}`, 'utf8')
    if (/localStorage|sessionStorage/.test(source)) storageUsers.push(entry.name)
  }
  assert.deepEqual(storageUsers, ['storage.js'])

  const domain = await readFile(new URL('../src/domain.js', import.meta.url), 'utf8')
  assert.doesNotMatch(domain, /^import /m)

  const components = await Promise.all(
    ['now-card-view.js', 'planning-view.js', 'review-view.js', 'guided-entry-form.js'].map(
      (name) => readFile(new URL(`../src/components/${name}`, import.meta.url), 'utf8'),
    ),
  )
  components.forEach((source) => assert.doesNotMatch(source, /from ['"]\.\.\/storage\.js['"]/))
})

test('배포 source는 runtime dependency와 generated build output을 요구하지 않는다', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(packageJson.dependencies, undefined)
  assert.equal(packageJson.devDependencies, undefined)
  assert.equal(packageJson.scripts.build, undefined)
})
