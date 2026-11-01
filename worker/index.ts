import { createApp } from './app.ts';
import { database } from './db/index.ts';
import { sendWeeklyReminder, vapidOf } from './reminder.ts';

const app = createApp();

async function sundayReminder(env: Env) {
  const delivery = await sendWeeklyReminder(database(env.DB), vapidOf(env));
  console.info('weekly reminder', delivery);
}

export default {
  fetch: app.fetch,
  // Sunday 20:00 in Tokyo; the schedule is in wrangler.jsonc.
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(sundayReminder(env));
  },
} satisfies ExportedHandler<Env>;
