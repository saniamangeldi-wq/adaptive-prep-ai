// Self-removing service worker. The app no longer uses a service worker; this file exists
// only so browsers that installed an earlier worker clean themselves up and reload.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.allSettled(cacheNames.map((name) => caches.delete(name)));
      } catch {
        // Cache API unavailable: nothing to clear.
      }
      await self.registration.unregister();
      const windowClients = await self.clients.matchAll({ type: "window" });
      await Promise.allSettled(windowClients.map((client) => client.navigate(client.url)));
    })()
  );
});
