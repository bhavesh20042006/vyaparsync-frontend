const CACHE_NAME = "vyaparsync-cache-v8";
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/icon-192-v2.png",
  "/icon-512-v2.png"
];

// 1. Install Phase: Cache the core files
self.addEventListener("install", (event) => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate Phase: Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Claim control immediately
});

// 2. Fetch Phase: Serve from cache if offline
self.addEventListener("fetch", (event) => {
  // Always serve index.html for navigation requests if offline
  if (event.request.mode === 'navigate') {
      event.respondWith(
          fetch(event.request).catch(() => {
              return caches.match('/index.html', { ignoreSearch: true }) || caches.match('/', { ignoreSearch: true });
          })
      );
      return;
  }

  // Only cache GET requests, and avoid caching API calls
  if (event.request.method !== "GET" || event.request.url.includes("/api/") || event.request.url.includes("localhost:5000")) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// 3. Push Event: Show Web Push Notification
self.addEventListener("push", (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: "/icon-192-v2.png",
        badge: "/icon-192-v2.png",
        vibrate: [200, 100, 200],
        data: {
          url: data.url || "/"
        }
      };
      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    } catch (e) {
      console.error("Error parsing push data:", e);
    }
  }
});

// 4. Notification Click Event: Navigate user
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
