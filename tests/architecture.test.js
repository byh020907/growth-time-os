import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const components = [
  'app-header.js',
  'growth-time-app.js',
  'guided-entry-form.js',
  'now-card-view.js',
  'planning-view.js',
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
