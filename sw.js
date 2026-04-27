const CACHE_NAME = "vyaparsync-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png"
];

// 1. Install Phase: Cache the core files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

// 2. Fetch Phase: Serve from cache if offline
self.addEventListener("fetch", (event) => {
  // Only cache GET requests, and avoid caching API calls for now
  if (event.request.method !== "GET" || event.request.url.includes("/api/") || event.request.url.includes("localhost:5000")) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if found, otherwise fetch from network
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
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
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
