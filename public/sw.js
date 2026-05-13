const CACHE_VERSION = 'v2'
const SHELL_CACHE = `shell-${CACHE_VERSION}`
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`

const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '')

const SHELL_FILES = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/favicon.ico',
  BASE + '/favicon-192.png',
  BASE + '/favicon-180-precomposed.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(BASE + '/index.html')),
    )
    return
  }

  const isStatic =
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.startsWith(BASE + '/assets/')

  if (!isStatic) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone()
        caches
          .open(RUNTIME_CACHE)
          .then((cache) => cache.put(request, responseClone))
          .catch(() => undefined)
        return response
      })
      .catch(() => caches.match(request)),
  )
})

self.addEventListener('notificationclick', (event) => {
  const data = event.notification?.data ?? {}
  const itemId = typeof data.itemId === 'string' ? data.itemId : undefined
  const channelKey = typeof data.channelKey === 'string' ? data.channelKey : undefined
  event.notification.close()

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: 'window',
      })
      const preferredClient =
        clients.find((client) => client.visibilityState === 'visible') ?? clients[0]

      if (preferredClient) {
        await preferredClient.focus()
        preferredClient.postMessage({
          type: 'NOTIFICATION_FOCUS',
          payload: {
            itemId,
            channelKey,
          },
        })
        return
      }

      const nextUrl = new URL(BASE + '/', self.location.origin)
      if (itemId) {
        nextUrl.searchParams.set('focusItemId', itemId)
      }
      if (channelKey) {
        nextUrl.searchParams.set('focusChannelKey', channelKey)
      }
      await self.clients.openWindow(nextUrl.toString())
    })(),
  )
})
