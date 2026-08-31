import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import test from 'node:test'

const rootUrl = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, rootUrl), 'utf8')

const pngDimensions = async (path) => {
  const bytes = await readFile(new URL(path, rootUrl))
  assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG')
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  }
}

test('manifest는 standalone install identity와 stable launch scope를 정의한다', async () => {
  const manifest = JSON.parse(await read('manifest.webmanifest'))
  assert.equal(manifest.id, './')
  assert.equal(manifest.name, 'Growth Time OS')
  assert.equal(manifest.start_url, './#now')
  assert.equal(manifest.scope, './')
  assert.equal(manifest.display, 'standalone')
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i)
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i)
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192' && icon.purpose === 'any'))
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any'))
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192' && icon.purpose === 'maskable'))
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable'))
  assert.deepEqual(manifest.shortcuts.map((shortcut) => shortcut.url), [
    './#now',
    './#plan',
    './#review',
  ])
})

test('manifest PNG와 Apple touch icon은 선언한 pixel size로 존재한다', async () => {
  const expected = new Map([
    ['assets/icons/icon-192.png', 192],
    ['assets/icons/icon-512.png', 512],
    ['assets/icons/icon-maskable-192.png', 192],
    ['assets/icons/icon-maskable-512.png', 512],
    ['assets/icons/apple-touch-icon.png', 180],
  ])
  for (const [path, size] of expected) {
    assert.deepEqual(await pngDimensions(path), { width: size, height: size })
  }
})

test('HTML entry는 manifest, scalable icon과 Apple touch icon을 노출한다', async () => {
  const html = await read('index.html')
  assert.match(html, /<link rel="manifest" href="\.\/manifest\.webmanifest"/)
  assert.match(html, /<link rel="icon" href="\.\/assets\/icons\/app-icon\.svg"/)
  assert.match(html, /<link rel="apple-touch-icon" href="\.\/assets\/icons\/apple-touch-icon\.png"/)
  assert.match(html, /<meta name="mobile-web-app-capable" content="yes"/)
  assert.match(html, /<growth-time-app><\/growth-time-app>\s*<pwa-controller><\/pwa-controller>/)
})

test('service worker shell 목록의 모든 asset이 존재하고 version token과 결합된다', async () => {
  const [worker, versionSource] = await Promise.all([
    read('service-worker.js'),
    read('app-version.js'),
  ])
  assert.match(versionSource, /GROWTH_TIME_OS_VERSION = '\d{4}\.\d{2}\.\d{2}\.\d+'/)
  assert.match(worker, /importScripts\('\.\/app-version\.js'\)/)
  assert.match(worker, /CACHE_NAME = `\$\{CACHE_PREFIX\}\$\{globalThis\.GROWTH_TIME_OS_VERSION\}`/)

  const shellBlock = worker.match(/const SHELL_PATHS = \[([\s\S]*?)\]\.map/)
  assert.ok(shellBlock)
  const paths = [...shellBlock[1].matchAll(/'\.\/([^']*)'/g)].map((match) => match[1])
  assert.ok(paths.length >= 20)
  for (const path of paths) {
    const resolved = path === '' ? new URL('./', rootUrl) : new URL(path, rootUrl)
    assert.ok((await stat(resolved)).isFile() || path === '')
  }
  assert.doesNotMatch(worker, /localStorage|indexedDB|growth-time-os:v1/)
})

test('새 worker는 user action 전에는 waiting을 건너뛰지 않는다', async () => {
  const worker = await read('service-worker.js')
  assert.doesNotMatch(worker.match(/addEventListener\('install'[\s\S]*?\n\}\)/)?.[0] ?? '', /skipWaiting/)
  assert.match(worker, /event\.data\?\.type === 'SKIP_WAITING'/)
  assert.match(worker, /self\.skipWaiting\(\)/)
  assert.match(worker, /cacheNames[\s\S]*name !== CACHE_NAME[\s\S]*caches\.delete/)
  assert.match(worker, /request\.mode === 'navigate'[\s\S]*networkFirstNavigation/)
  assert.match(worker, /cache\.match\(INDEX_URL\)/)
})

test('PWA controller는 install prompt와 waiting update를 user-driven action으로 연결한다', async () => {
  const controller = await read('src/components/pwa-controller.js')
  assert.match(controller, /beforeinstallprompt/)
  assert.match(controller, /appinstalled/)
  assert.match(controller, /updateViaCache: 'none'/)
  assert.match(controller, /registration\.waiting/)
  assert.match(controller, /waiting\.postMessage\(\{ type: 'SKIP_WAITING' \}\)/)
  assert.match(controller, /controllerchange/)
  assert.match(controller, /this\.updateAccepted = false/)
  assert.match(controller, /if \(!this\.updateAccepted \|\| this\.reloading\) return/)
  assert.match(controller, /this\.updateAccepted = true[\s\S]*waiting\.postMessage/)
  assert.match(controller, />나중에</)
  assert.match(controller, /this\.installPrompt\.prompt\(\)/)
  assert.match(controller, /this\.registration\.update\(\)\.catch\(\(\) => \{\}\)/)
})
