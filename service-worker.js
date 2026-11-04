// KostetMich: offline cache and privacy-conscious push notifications.
const CACHE = 'kostetmich-pwa-v3';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});

// The server should send only a generic reminder type, never sensitive financial details.
self.addEventListener('push', event => {
  let kind = 'general';
  try {
    if (event.data) {
      const payload = event.data.json();
      if (payload && typeof payload.type === 'string') kind = payload.type;
    }
  } catch (_) {
    // Ignore invalid or unexpected payloads.
  }

  const messages = {
    bill: 'Eine Rechnung könnte bald fällig sein.',
    debt: 'Eine geplante Zahlung könnte bald fällig sein.',
    savings: 'Denk daran, dein Sparziel zu prüfen.',
    budget: 'Schau dir deine aktuelle Budgetplanung an.',
    general: 'In KostetMich gibt es eine neue Erinnerung.'
  };
  const body = Object.prototype.hasOwnProperty.call(messages, kind) ? messages[kind] : messages.general;
  event.waitUntil(self.registration.showNotification('KostetMich – Erinnerung', {
    body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'kostetmich-reminder',
    data: { url: new URL('./', self.registration.scope).href }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const appUrl = new URL('./', self.registration.scope).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && new URL(client.url).pathname.startsWith(new URL(appUrl).pathname)) {
        return client.focus();
      }
    }
    return self.clients.openWindow(appUrl);
  })());
});
