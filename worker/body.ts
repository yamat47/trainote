import { validator } from 'hono/validator';
import type { z } from 'zod';
import { problem } from './problem.ts';

// An :id that is a positive integer, or a 404 problem with the given title: an id that is
// not one names nothing, the same as an id that is not the caller's.
export const idParamOr404 = (title: string) =>
  validator('param', (value, c) => {
    const id = Number(value['id']);
    return Number.isSafeInteger(id) && id > 0 ? { id } : problem(c, 404, title);
  });

// A JSON body that must fit the schema, or a 400 problem with the given title.
export const jsonBody = <T>(schema: z.ZodType<T>, title: string) =>
  validator('json', (value, c) => {
    const parsed = schema.safeParse(value);
    return parsed.success ? parsed.data : problem(c, 400, title);
  });
