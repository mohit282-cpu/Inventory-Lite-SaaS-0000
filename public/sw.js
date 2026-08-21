/**
 * Inventory Lite Production Service Worker
 * 
 * Handles app shell caching for fast loading & offline status detection.
 * Enforces strict network-first strategy for Appwrite API requests to prevent stale inventory or payment data.
 */

const CACHE_NAME = 'inventory-lite-v1'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon.svg',
  '/favicon.ico',
]

// Install Event: Cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Service worker precache warning:', err)
      })
    })
  )
  self.skipWaiting()
})

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch Event: Cache static assets, Network-First for API requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // 1. NEVER cache Appwrite database API requests or dynamic server actions (Always Network-First)
  if (
    url.pathname.includes('/v1/databases') ||
    url.pathname.includes('/v1/account') ||
    url.pathname.includes('/v1/storage') ||
    event.request.method !== 'GET'
  ) {
    event.respondWith(
      fetch(event.request).catch((error) => {
        // Return offline JSON error for API calls during network loss
        return new Response(
          JSON.stringify({ error: 'Offline', message: 'You are currently offline. Please check your network connection.' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      })
    )
    return
  }

  // 2. Cache-First for static assets (images, fonts, scripts)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update for cache
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse)
              })
            }
          })
          .catch(() => {})
        return cachedResponse
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse
          }

          const responseToCache = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return networkResponse
        })
        .catch(() => {
          // Offline fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/') || new Response('Offline', { status: 503 })
          }
          return new Response('Network error', { status: 408 })
        })
    })
  )
})

// Listen for update skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
