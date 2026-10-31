import { createApp } from './app.ts';

const app = createApp();

export default {
  fetch: app.fetch,
  // The Sunday review notification is not built yet. The cron is already in
  // wrangler.jsonc so the schedule is in place when the push sender lands.
  scheduled() {},
} satisfies ExportedHandler<Env>;
