/* eslint-disable no-restricted-globals */

const CACHE_NAME = "manager-pro-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo192.svg",
  "/logo512.svg"
];

// INSTALL
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))

      )
    )
  );
  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
