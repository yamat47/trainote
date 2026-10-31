import type { Database } from './db/index.ts';
import { users, type User } from './db/schema.ts';

export async function findOrCreateUser(db: Database, email: string): Promise<User> {
  // `onConflictDoNothing` returns no row when the user already exists; the no-op update
  // makes SQLite return the existing row in the same statement.
  const [user] = await db
    .insert(users)
    .values({ email })
    .onConflictDoUpdate({ target: users.email, set: { email } })
    .returning();
  if (user === undefined) throw new Error(`upsert of ${email} returned no row`);
  return user;
}
