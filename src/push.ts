import { hc } from 'hono/client';
import type { AppType } from '../worker/app.ts';

const client = hc<AppType>('/');

export type ReminderState = 'unsupported' | 'denied' | 'off' | 'on';

// iOS exposes the Push API only to a web app added to the home screen, so this is also
// the "not installed yet" check there.
const supported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const subscription = () =>
  navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription());

export async function reminderState(): Promise<ReminderState> {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return (await subscription()) === null ? 'off' : 'on';
}

export async function turnOn(): Promise<ReminderState> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  const config = await client.api.push['vapid-public-key'].$get();
  if (!config.ok) {
    throw new Error(`GET /api/push/vapid-public-key answered ${String(config.status)}`);
  }
  const { vapidPublicKey } = await config.json();

  const registration = await navigator.serviceWorker.ready;
  const subscribed = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidPublicKey,
  });
  const keys = subscribed.toJSON().keys;
  const p256dh = keys?.['p256dh'];
  const auth = keys?.['auth'];
  if (p256dh === undefined || auth === undefined) {
    await subscribed.unsubscribe();
    throw new Error('the push subscription came without keys');
  }

  const saved = await client.api.push.subscriptions[':endpoint'].$put({
    param: { endpoint: encodeURIComponent(subscribed.endpoint) },
    json: { p256dh, auth },
  });
  if (!saved.ok) {
    // Not stored on the server, so not kept in the browser either.
    await subscribed.unsubscribe();
    throw new Error(`PUT /api/push/subscriptions answered ${String(saved.status)}`);
  }
  return 'on';
}

export type TestOutcome = 'sent' | 'nothing-to-send' | 'failed';

// The reminder, now, to this browser and the owner's other devices. "Nothing to send"
// is the server holding no row for this device, which no retry fixes: the device
// subscribes again by turning the reminder off and on.
export async function sendTestReminder(): Promise<TestOutcome> {
  const response = await client.api.push.test.$post();
  if (!response.ok) throw new Error(`POST /api/push/test answered ${String(response.status)}`);
  const { sent, failed } = await response.json();
  if (sent > 0) return 'sent';
  return failed === 0 ? 'nothing-to-send' : 'failed';
}

export async function turnOff(): Promise<ReminderState> {
  const current = await subscription();
  if (current === null) return 'off';
  const removed = await client.api.push.subscriptions[':endpoint'].$delete({
    param: { endpoint: encodeURIComponent(current.endpoint) },
  });
  if (!removed.ok) {
    throw new Error(`DELETE /api/push/subscriptions answered ${String(removed.status)}`);
  }
  await current.unsubscribe();
  return 'off';
}
