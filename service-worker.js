importScripts('./app-version.js')

const CACHE_PREFIX = 'growth-time-os-shell-'
const CACHE_NAME = `${CACHE_PREFIX}${globalThis.GROWTH_TIME_OS_VERSION}`
const BASE_URL = new URL('./', self.location.href)
const INDEX_URL = new URL('./index.html', BASE_URL).href
const SHELL_PATHS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './app-version.js',
  './src/styles.css',
  './src/main.js',
  './src/domain.js',
  './src/storage.js',
  './src/ui.js',
  './src/components/app-header.js',
  './src/components/growth-time-app.js',
  './src/components/guided-entry-form.js',
  './src/components/now-card-view.js',
  './src/components/planning-view.js',
  './src/components/pwa-controller.js',
  './src/components/review-view.js',
  './assets/icons/app-icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
].map((path) => new URL(path, BASE_URL).href)
const SHELL_URLS = new Set(SHELL_PATHS)

const precacheShell = async () => {
  const cache = await caches.open(CACHE_NAME)
  await Promise.all(
    SHELL_PATHS.map(async (url) => {
      const response = await fetch(url, { cache: 'reload' })
      if (!response.ok) throw new Error(`Precache failed: ${url}`)
      await cache.put(url, response)
    }),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

const networkFirstNavigation = async (request) => {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(INDEX_URL, response.clone())
    return response
  } catch {
    return (await cache.match(INDEX_URL)) ?? (await cache.match(new URL('./', BASE_URL).href))
  }
}

const cacheFirstShell = async (request) => {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) await cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }
  if (SHELL_URLS.has(url.href)) event.respondWith(cacheFirstShell(request))
})
