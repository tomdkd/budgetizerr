self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Budgetizerr';
  const options = {
    body: data.body || 'Nouvelle notification.',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/badge.svg',
    data: { url: data.url || '/operations' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/operations';
  event.waitUntil(clients.openWindow(targetUrl));
});
