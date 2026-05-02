// =======================================================
// 🚀 VYAPARSYNC SERVICE WORKER (NO CACHING MODE)
// =======================================================
// The user explicitly requested NO fallback to cache, even if offline.
// This Service Worker is now strictly for Web Push Notifications.

// 1. Install Phase
self.addEventListener("install", (event) => {
  self.skipWaiting(); // Force activation immediately
});

// 2. Activate Phase: Nuke all existing caches from previous versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Phase: Bypass completely (Browser handles requests natively)
self.addEventListener("fetch", (event) => {
  // We do not intercept fetches anymore. 
  // 100% live network requests.
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
