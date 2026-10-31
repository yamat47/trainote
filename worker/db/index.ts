import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema.ts';

export function database(d1: D1Database) {
  return drizzle(d1, { schema, casing: 'snake_case' });
}

export type Database = ReturnType<typeof database>;
