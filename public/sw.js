const CACHE_NAME_STATIC = "imchat-static-v2";
const CACHE_NAME_MEDIA = "imchat-media-v1";

const ASSETS_TO_PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json"
];

// Install Event
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME_STATIC).then((cache) => {
      console.log("[Service Worker] Pre-caching Core Offline Shell...");
      return cache.addAll(ASSETS_TO_PRECACHE).catch((err) => {
        console.warn("[Service Worker] Pre-cache warning: some files skipped", err);
      });
    })
  );
});

// Activate Event - Clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME_STATIC && key !== CACHE_NAME_MEDIA) {
            console.log("[Service Worker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper for checking if a request is an image or media thumbnail
function isMediaRequest(request) {
  const url = request.url;
  
  // Check headers if available
  const isImageHeader = request.headers && request.headers.get("accept") && request.headers.get("accept").includes("image");
  if (isImageHeader) return true;

  // Check destination
  if (request.destination === "image" || request.destination === "video") return true;

  // Check URL signatures (Firebase Storage, Cloudinary, local uploads, placeholders, etc.)
  if (
    url.includes("/uploads/") ||
    url.includes("firebasestorage.googleapis.com") ||
    url.includes("cloudinary.com") ||
    url.includes("placehold.co") ||
    url.includes("via.placeholder.com") ||
    url.includes("blogger.googleusercontent.com") ||
    url.match(/\.(png|jpe?g|gif|svg|webp|mp4|webm)($|\?)/i)
  ) {
    return true;
  }

  return false;
}

// Fetch event intercepts
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // We only intercept GET requests
  if (request.method !== "GET") return;

  // Ignore WebSockets, chrome extensions, hot reloads, firestore database calls directly or internal firebase-auth
  if (
    url.protocol.startsWith("chrome-extension") ||
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("identitytoolkit.googleapis.com") ||
    url.port === "24678" // Vite HMR WS port
  ) {
    return;
  }

  // Caching Strategy for Media assets (Images, Avatars, Reels thumbnails) - Cache First with Network Fallback & Background Update
  if (isMediaRequest(request)) {
    event.respondWith(
      caches.open(CACHE_NAME_MEDIA).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Background Revalidation - update cache dynamically when online to keep thumbnails fresh
            fetch(request).then((networkResponse) => {
              if (networkResponse.status === 200 || networkResponse.status === 0) {
                cache.put(request, networkResponse);
              }
            }).catch(() => {/* Ignore background errors when offline */});
            return cachedResponse;
          }

          // Fetch from network, dynamic cache and return
          return fetch(request).then((networkResponse) => {
            // Cache successful or opaque cross-origin requests (status 0)
            if (networkResponse.status === 200 || networkResponse.status === 0) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch((err) => {
            console.warn("[Service Worker] Resource offline fetch failed for:", request.url, err);
            // Fallback for missing elements
            if (url.href.includes("avatar")) {
              return caches.match("https://via.placeholder.com/150/EEEEEE/000000?text=Avatar");
            }
            return caches.match("https://via.placeholder.com/400x400.png?text=Offline");
          });
        });
      })
    );
    return;
  }

  // Caching Strategy for Core Application / Static Assets (JS, CSS, configs) - Stale-While-Revalidate
  const isStaticAsset = 
    url.pathname.match(/\.(js|css|woff2?|ttf|otf|json|ico)($|\?)/i) || 
    (url.origin === self.location.origin && url.pathname !== "/" && !url.pathname.endsWith("/index.html"));

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME_STATIC).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch((err) => {
            console.log("[Service Worker] Fetch failed for offline static asset, returning cache if exists", err);
          });

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Navigate requests (HTML core layout pages) should prefer network first then fallback to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch((err) => {
        console.log("[Service Worker] Application navigation offline, rolling back to cache / index.html", err);
        return caches.match("/index.html") || caches.match("/");
      })
    );
  }
});
