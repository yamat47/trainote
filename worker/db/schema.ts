import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const ENTRY_KINDS = ['win', 'slip'] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export const CATEGORIES = ['exercise', 'food', 'sleep', 'life'] as const;
export type Category = (typeof CATEGORIES)[number];

export const MESSAGE_ROLES = ['user', 'assistant'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

// A chat the person started, or the week's review the Coach tab and the Sunday
// reminder open with a fixed first message.
export const THREAD_KINDS = ['chat', 'weekly-review'] as const;
export type ThreadKind = (typeof THREAD_KINDS)[number];

// RFC 3339 in UTC with milliseconds, so rows sort by time as text.
export const NOW = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

const timestamp = () => text().notNull().default(NOW);

// Set by SQLite on insert and by drizzle on db.update(). An upsert's onConflictDoUpdate
// bypasses $onUpdate, so its `set` has to name updatedAt itself.
const updatedAt = () => timestamp().$onUpdate(() => NOW);

const oneOf = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '));

export const users = sqliteTable('users', {
  id: integer().primaryKey({ autoIncrement: true }),
  email: text().notNull().unique(),
  createdAt: timestamp(),
});

export const profiles = sqliteTable('profiles', {
  userId: integer()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  heightCm: real(),
  birthYear: integer(),
  sex: text(),
  goalWeightKg: real(),
  // YYYY-MM-DD.
  goalDeadline: text(),
  trainingPlace: text(),
  equipment: text(),
  weeklySessions: integer(),
  constraints: text(),
  updatedAt: updatedAt(),
});

export const entries = sqliteTable(
  'entries',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // YYYY-MM-DD in Asia/Tokyo, the day the act belongs to.
    date: text().notNull(),
    kind: text({ enum: ENTRY_KINDS }).notNull(),
    category: text({ enum: CATEGORIES }).notNull(),
    body: text().notNull(),
    createdAt: timestamp(),
  },
  (t) => [
    index('entries_user_id_date_idx').on(t.userId, t.date),
    check('entries_kind_check', sql`${t.kind} in (${oneOf(ENTRY_KINDS)})`),
    check('entries_category_check', sql`${t.category} in (${oneOf(CATEGORIES)})`),
  ],
);

export const workoutItems = sqliteTable(
  'workout_items',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    entryId: integer()
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    position: integer().notNull(),
    exercise: text().notNull(),
    weightKg: real(),
    reps: integer(),
    sets: integer(),
    durationMin: real(),
    distanceKm: real(),
  },
  (t) => [uniqueIndex('workout_items_entry_id_position_idx').on(t.entryId, t.position)],
);

export const weights = sqliteTable(
  'weights',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // YYYY-MM-DD in Asia/Tokyo. One row per day.
    date: text().notNull(),
    weightKg: real().notNull(),
    bodyFatPct: real(),
    createdAt: timestamp(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('weights_user_id_date_idx').on(t.userId, t.date)],
);

export const threads = sqliteTable(
  'threads',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text({ enum: THREAD_KINDS }).notNull().default('chat'),
    title: text().notNull(),
    createdAt: timestamp(),
    // The time of the last message, so the list orders by it.
    updatedAt: updatedAt(),
  },
  (t) => [
    index('threads_user_id_updated_at_idx').on(t.userId, t.updatedAt),
    check('threads_kind_check', sql`${t.kind} in (${oneOf(THREAD_KINDS)})`),
  ],
);

export const messages = sqliteTable(
  'messages',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    threadId: integer()
      .notNull()
      .references(() => threads.id, { onDelete: 'cascade' }),
    role: text({ enum: MESSAGE_ROLES }).notNull(),
    content: text().notNull(),
    createdAt: timestamp(),
  },
  (t) => [
    index('messages_thread_id_idx').on(t.threadId),
    check('messages_role_check', sql`${t.role} in (${oneOf(MESSAGE_ROLES)})`),
  ],
);

export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: integer().primaryKey({ autoIncrement: true }),
  userId: integer()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text().notNull().unique(),
  p256dh: text().notNull(),
  auth: text().notNull(),
  createdAt: timestamp(),
});

export type User = typeof users.$inferSelect;
