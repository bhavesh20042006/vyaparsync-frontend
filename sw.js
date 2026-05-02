const CACHE_NAME = "vyaparsync-cache-v11";
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/icon-192-v3.png",
  "/icon-512-v3.png"
];

// 1. Install Phase: Cache the core files
self.addEventListener("install", (event) => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      // Use cache busting to ensure we download the freshest files during install
      return cache.addAll(urlsToCache.map(url => url + "?t=" + Date.now()));
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

// 2. Fetch Phase: NETWORK-FIRST STRATEGY (Solves stale UI bugs)
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET" || event.request.url.includes("/api/") || event.request.url.includes("localhost:5000")) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If we get a valid response, update the cache
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Strip the cache-busting query string when storing in cache so match works later
            cache.put(event.request.url.split('?')[0], responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If network fails (offline), return from cache
        return caches.match(event.request.url.split('?')[0], { ignoreSearch: true })
          .then((cachedResponse) => {
             // Fallback to index.html if navigating and nothing is in cache
             if (!cachedResponse && event.request.mode === 'navigate') {
                 return caches.match('/index.html', { ignoreSearch: true });
             }
             return cachedResponse;
          });
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
        icon: "/icon-192-v3.png",
        badge: "/icon-192-v3.png",
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
