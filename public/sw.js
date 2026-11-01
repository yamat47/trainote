// @ts-check
// Push only. There is no fetch handler on purpose: a service worker that answered
// navigations would sit between Safari and the Cloudflare Access login redirect.
// Plain JavaScript because the file is served as it is from public/; tsconfig.sw.json
// checks it.

// lib.webworker types `self` as a plain worker; this file only runs as a service worker.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

/** @typedef {{ title?: string; body?: string; tag?: string; url?: string }} Payload */

/**
 * The fields of the Worker's payload that are strings, and nothing else.
 * @param {PushMessageData | null} data
 * @returns {Payload}
 */
function payloadOf(data) {
  if (data === null) return {};
  /** @type {unknown} */
  const parsed = data.json();
  if (typeof parsed !== 'object' || parsed === null) return {};
  return {
    ...('title' in parsed && typeof parsed.title === 'string' ? { title: parsed.title } : {}),
    ...('body' in parsed && typeof parsed.body === 'string' ? { body: parsed.body } : {}),
    ...('tag' in parsed && typeof parsed.tag === 'string' ? { tag: parsed.tag } : {}),
    ...('url' in parsed && typeof parsed.url === 'string' ? { url: parsed.url } : {}),
  };
}

/**
 * @param {unknown} data
 * @returns {string}
 */
function urlOf(data) {
  if (typeof data !== 'object' || data === null || !('url' in data)) return '/';
  return typeof data.url === 'string' ? data.url : '/';
}

sw.addEventListener('install', (event) => {
  event.waitUntil(sw.skipWaiting());
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(sw.clients.claim());
});

sw.addEventListener('push', (event) => {
  const payload = payloadOf(event.data);
  event.waitUntil(
    sw.registration.showNotification(payload.title ?? 'trainote', {
      ...(payload.body === undefined ? {} : { body: payload.body }),
      ...(payload.tag === undefined ? {} : { tag: payload.tag }),
      data: { url: payload.url ?? '/' },
    }),
  );
});

sw.addEventListener('notificationclick', (event) => {
  event.notification.close();
  /** @type {unknown} */
  const data = event.notification.data;
  const url = new URL(urlOf(data), sw.location.origin).href;
  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows[0];
      if (open === undefined) return sw.clients.openWindow(url);
      return open.focus().then((focused) => focused.navigate(url));
    }),
  );
});
