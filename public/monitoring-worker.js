const CACHE_NAME = 'viewhub-monitoring-cache-v1';
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/main.css',
  '/main.js'
];

// Install event - cache app shell files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(APP_SHELL_FILES);
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  // Claim any clients immediately
  self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // For API calls, try network first, then cache
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // For static assets, try cache first, then network
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          // Add fetched files to cache
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  }
});

// Background Sync
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background Sync', event.tag);
  if (event.tag === 'sync-mobile-usage') {
    event.waitUntil(syncMobileUsage());
  }
});

// Function to sync mobile usage data when back online
async function syncMobileUsage() {
  // Get stored offline usage records from IndexedDB
  const db = await openDatabase();
  const offlineRecords = await getAllOfflineRecords(db);
  
  if (offlineRecords.length === 0) {
    console.log('[Service Worker] No offline records to sync');
    return;
  }
  
  console.log('[Service Worker] Syncing', offlineRecords.length, 'offline records');
  
  // Send each record to the server
  const promises = offlineRecords.map(async (record) => {
    try {
      const response = await fetch('/api/mobile-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
      });
      
      if (response.ok) {
        // Remove from offline store
        await deleteOfflineRecord(db, record.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Service Worker] Error syncing record', error);
      return false;
    }
  });
  
  await Promise.all(promises);
  console.log('[Service Worker] Sync completed');
}

// IndexedDB functions for offline storage
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ViewHubOfflineDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('mobileUsage')) {
        db.createObjectStore('mobileUsage', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

function getAllOfflineRecords(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['mobileUsage'], 'readonly');
    const store = transaction.objectStore('mobileUsage');
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

function deleteOfflineRecord(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['mobileUsage'], 'readwrite');
    const store = transaction.objectStore('mobileUsage');
    const request = store.delete(id);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Periodic background sync to check schedules
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-schedules') {
    event.waitUntil(checkSchedules());
  }
});

// Function to check schedules and communicate with the main thread
async function checkSchedules() {
  console.log('[Service Worker] Periodic check of schedules');
  
  try {
    // Notify all clients
    const allClients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of allClients) {
      client.postMessage({
        type: 'MONITORING_PULSE',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[Service Worker] Error in periodic check', error);
  }
}

// Set up monitoring interval (since periodicsync may not be supported in all browsers)
const INTERVAL_MINUTES = 1;
setInterval(() => {
  checkSchedules();
}, INTERVAL_MINUTES * 60 * 1000);

// Listen for messages from the client
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Got message from client', event.data);
  
  if (event.data.type === 'INIT_MONITORING') {
    // Register a periodic sync if browser supports it
    if ('periodicSync' in self.registration) {
      try {
        self.registration.periodicSync.register('check-schedules', {
          minInterval: INTERVAL_MINUTES * 60 * 1000
        });
        console.log('[Service Worker] Registered periodic sync');
      } catch (error) {
        console.error('[Service Worker] Periodic sync registration error', error);
      }
    }
  }
  
  if (event.data.type === 'STORE_OFFLINE_USAGE') {
    storeOfflineUsage(event.data.record);
  }
});

// Store offline usage record in IndexedDB
async function storeOfflineUsage(record) {
  if (!record) return;
  
  try {
    const db = await openDatabase();
    const transaction = db.transaction(['mobileUsage'], 'readwrite');
    const store = transaction.objectStore('mobileUsage');
    
    // Generate a unique ID if not present
    if (!record.id) {
      record.id = offline_${Date.now()}_${Math.floor(Math.random() * 1000)};
    }
    
    const request = store.add(record);
    
    request.onsuccess = () => {
      console.log('[Service Worker] Stored offline usage record', record.id);
      
      // Register for background sync to send when back online
      if ('sync' in self.registration) {
        self.registration.sync.register('sync-mobile-usage');
      }
    };
    
    request.onerror = (event) => {
      console.error('[Service Worker] Error storing offline record', event.target.error);
    };
  } catch (error) {
    console.error('[Service Worker] DB error storing offline record', error);
  }
}
