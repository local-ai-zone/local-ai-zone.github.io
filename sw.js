/**
 * Service Worker for GGUF Model Discovery
 * Provides offline support and caching for better performance
 * Requirements: 5.1, 5.2
 */

const CACHE_NAME = 'gguf-models-v1';
const STATIC_CACHE_NAME = 'gguf-static-v1';
const DATA_CACHE_NAME = 'gguf-data-v1';

// Files to cache for offline support
const STATIC_FILES = [
  '/',
  '/index.html',
  '/main.js',
  '/styles/main.css',
  '/manifest.json'
];

// Data files to cache
const DATA_FILES = [
  '/gguf_models.json',
  '/gguf_models_estimated_sizes.json'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      }),
      // Cache data files
      caches.open(DATA_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching data files');
        return cache.addAll(DATA_FILES);
      })
    ]).then(() => {
      console.log('[SW] Service worker installed successfully');
      // Force activation of new service worker
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DATA_CACHE_NAME && 
              cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service worker activated');
      // Take control of all clients
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external requests (except for fonts and CDN resources)
  if (url.origin !== self.location.origin && 
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('fonts.gstatic.com') &&
      !url.hostname.includes('cdn.tailwindcss.com')) {
    return;
  }
  
  event.respondWith(
    handleRequest(request)
  );
});

/**
 * Handle different types of requests with appropriate caching strategies
 */
async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // Strategy 1: Cache First for static assets
    if (isStaticAsset(pathname)) {
      return await cacheFirst(request, STATIC_CACHE_NAME);
    }
    
    // Strategy 2: Stale While Revalidate for data files
    if (isDataFile(pathname)) {
      return await staleWhileRevalidate(request, DATA_CACHE_NAME);
    }
    
    // Strategy 3: Network First for HTML pages
    if (isHTMLRequest(request)) {
      return await networkFirst(request, STATIC_CACHE_NAME);
    }
    
    // Strategy 4: Cache First for external resources (fonts, CDN)
    if (isExternalResource(url)) {
      return await cacheFirst(request, CACHE_NAME);
    }
    
    // Default: Network only
    return await fetch(request);
    
  } catch (error) {
    console.error('[SW] Request failed:', error);
    
    // Return offline fallback for HTML requests
    if (isHTMLRequest(request)) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      return await cache.match('/index.html') || new Response('Offline', { status: 503 });
    }
    
    // Return error response for other requests
    return new Response('Network error', { status: 503 });
  }
}

/**
 * Cache First strategy - check cache first, fallback to network
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  
  // Cache successful responses
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

/**
 * Network First strategy - try network first, fallback to cache
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Stale While Revalidate strategy - return cache immediately, update in background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Fetch from network in background
  const networkResponsePromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Ignore network errors in background update
  });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If no cache, wait for network
  return await networkResponsePromise;
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(pathname) {
  return pathname.endsWith('.js') || 
         pathname.endsWith('.css') || 
         pathname.endsWith('.png') || 
         pathname.endsWith('.jpg') || 
         pathname.endsWith('.jpeg') || 
         pathname.endsWith('.gif') || 
         pathname.endsWith('.svg') || 
         pathname.endsWith('.ico') ||
         pathname.endsWith('.woff') ||
         pathname.endsWith('.woff2') ||
         pathname.endsWith('.ttf');
}

/**
 * Check if request is for a data file
 */
function isDataFile(pathname) {
  return pathname.endsWith('.json') || 
         pathname.includes('gguf_models');
}

/**
 * Check if request is for HTML
 */
function isHTMLRequest(request) {
  return request.headers.get('accept')?.includes('text/html');
}

/**
 * Check if request is for external resource
 */
function isExternalResource(url) {
  return url.hostname.includes('fonts.googleapis.com') ||
         url.hostname.includes('fonts.gstatic.com') ||
         url.hostname.includes('cdn.tailwindcss.com');
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for data updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-data') {
    event.waitUntil(updateDataCache());
  }
});

/**
 * Update data cache in background
 */
async function updateDataCache() {
  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    
    // Update model data
    const modelsResponse = await fetch('/gguf_models.json');
    if (modelsResponse.ok) {
      await cache.put('/gguf_models.json', modelsResponse);
      console.log('[SW] Updated models data cache');
    }
    
    // Update size estimates
    const sizesResponse = await fetch('/gguf_models_estimated_sizes.json');
    if (sizesResponse.ok) {
      await cache.put('/gguf_models_estimated_sizes.json', sizesResponse);
      console.log('[SW] Updated sizes data cache');
    }
  } catch (error) {
    console.error('[SW] Failed to update data cache:', error);
  }
}