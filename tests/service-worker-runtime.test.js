import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const workerSource = await readFile(
  new URL('../service-worker.js', import.meta.url),
  'utf8',
)
const versionSource = await readFile(new URL('../app-version.js', import.meta.url), 'utf8')
const version = versionSource.match(/'([^']+)'/)?.[1]

const createWorkerHarness = () => {
  const handlers = new Map()
  const cacheStores = new Map()
  let online = true
  let claimed = 0
  let skipped = 0

  class FakeCache {
    constructor() { this.entries = new Map() }
    async put(key, response) {
      const url = typeof key === 'string' ? key : key.url
      this.entries.set(url, response.clone())
    }
    async match(key) {
      const url = typeof key === 'string' ? key : key.url
      return this.entries.get(url)?.clone()
    }
  }

  const caches = {
    async open(name) {
      if (!cacheStores.has(name)) cacheStores.set(name, new FakeCache())
      return cacheStores.get(name)
    },
    async keys() { return [...cacheStores.keys()] },
    async delete(name) { return cacheStores.delete(name) },
  }

  const self = {
    location: { href: 'https://example.test/growth/service-worker.js', origin: 'https://example.test' },
    clients: { async claim() { claimed += 1 } },
    async skipWaiting() { skipped += 1 },
    addEventListener(type, handler) { handlers.set(type, handler) },
  }

  const context = {
    URL,
    Set,
    Promise,
    Response,
    self,
    caches,
    async fetch(request) {
      if (!online) throw new Error('offline')
      const url = typeof request === 'string' ? request : request.url
      return new Response(`<html>${url}</html>`, {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })
    },
  }
  context.globalThis = context
  context.importScripts = () => { context.GROWTH_TIME_OS_VERSION = version }
  vm.runInNewContext(workerSource, context)

  return {
    handlers,
    cacheStores,
    setOnline(value) { online = value },
    get claimed() { return claimed },
    get skipped() { return skipped },
  }
}

const waitableEvent = () => {
  let completion
  return {
    event: { waitUntil(promise) { completion = promise } },
    async done() { await completion },
  }
}

test('service worker install은 versioned shell을 precache하고 activate는 이전 cache만 정리한다', async () => {
  const harness = createWorkerHarness()
  const install = waitableEvent()
  harness.handlers.get('install')(install.event)
  await install.done()

  const currentName = `growth-time-os-shell-${version}`
  const currentCache = harness.cacheStores.get(currentName)
  assert.ok(currentCache)
  assert.ok(currentCache.entries.size >= 20)
  assert.ok(currentCache.entries.has('https://example.test/growth/index.html'))

  harness.cacheStores.set('growth-time-os-shell-old', { entries: new Map() })
  harness.cacheStores.set('unrelated-cache', { entries: new Map() })
  const activate = waitableEvent()
  harness.handlers.get('activate')(activate.event)
  await activate.done()
  assert.equal(harness.cacheStores.has('growth-time-os-shell-old'), false)
  assert.equal(harness.cacheStores.has('unrelated-cache'), true)
  assert.equal(harness.claimed, 1)
})

test('navigation network failure는 cached index fallback을 반환한다', async () => {
  const harness = createWorkerHarness()
  const install = waitableEvent()
  harness.handlers.get('install')(install.event)
  await install.done()
  harness.setOnline(false)

  let responsePromise
  harness.handlers.get('fetch')({
    request: {
      method: 'GET',
      mode: 'navigate',
      url: 'https://example.test/growth/#now',
    },
    respondWith(promise) { responsePromise = promise },
  })
  const response = await responsePromise
  assert.equal(response.status, 200)
  assert.match(await response.text(), /growth\/index\.html/)
})

test('SKIP_WAITING message만 waiting worker activation을 허용한다', async () => {
  const harness = createWorkerHarness()
  await harness.handlers.get('message')({ data: { type: 'OTHER' } })
  assert.equal(harness.skipped, 0)
  await harness.handlers.get('message')({ data: { type: 'SKIP_WAITING' } })
  assert.equal(harness.skipped, 1)
})
