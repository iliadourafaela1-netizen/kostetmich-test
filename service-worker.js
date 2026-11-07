
 // KostetMich: Offline-Cache und Push-Benachrichtigungen

const CACHE = 'kostetmich-pwa-v8';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

// Installation
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Alte Cache-Versionen entfernen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith('kostetmich-pwa-') && key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Offline-Unterstützung
self.addEventListener('fetch', event => {
  if (
    event.request.method !== 'GET' ||
    new URL(event.request.url).origin !== self.location.origin
  ) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});

// Push-Benachrichtigungen
// Keine sensiblen Finanzdaten in Benachrichtigungen anzeigen.

self.addEventListener('push', event => {
  let kind = 'general';

  try {
    if (event.data) {
      const payload = event.data.json();

      if (
        payload &&
        typeof payload.type === 'string'
      ) {
        kind = payload.type;
      }
    }
  } catch (_) {
    // Ungültige Daten ignorieren
  }

  const messages = {
    bill: 'Eine Rechnung könnte bald fällig sein.',
    debt: 'Eine geplante Zahlung könnte bald fällig sein.',
    savings: 'Denk daran, dein Sparziel zu prüfen.',
    budget: 'Schau dir deine aktuelle Budgetplanung an.',
    general: 'In KostetMich gibt es eine neue Erinnerung.'
  };

  const body = (typeof payload !== "undefined" && typeof payload.body === "string" && payload.body.trim())
  ? payload.body
  : (messages[kind] || messages.general);

  event.waitUntil(
    self.registration.showNotification(
      
(typeof payload !== 'undefined' && typeof payload.title === 'string' && payload.title.trim())
  ? payload.title
  : 'KostetMich 💜 Erinnerung',

      {
        body: body,
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: 'kostetmich-reminder',
        data: {
          url: new URL('./', self.registration.scope).href
        }
      }
    )
  );
});

// Beim Antippen der Benachrichtigung App öffnen
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const appUrl = new URL('./', self.registration.scope).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      for (const client of windows) {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(appUrl);

        if (
          clientUrl.origin === targetUrl.origin &&
          clientUrl.pathname.startsWith(targetUrl.pathname)
        ) {
          return client.focus();
        }
      }

      return self.clients.openWindow(appUrl);
    })()
  );
});

