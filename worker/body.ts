import { validator } from 'hono/validator';
import type { z } from 'zod';
import { problem } from './problem.ts';

// A JSON body that must fit the schema, or a 400 problem with the given title.
export const jsonBody = <T>(schema: z.ZodType<T>, title: string) =>
  validator('json', (value, c) => {
    const parsed = schema.safeParse(value);
    return parsed.success ? parsed.data : problem(c, 400, title);
  });
