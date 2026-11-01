// Writes design/src/tokens.css, the app's tokens, from design/system/tokens.json. The
// icon font is not declared there: the app has it from the framework7-icons package.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import source from '../design/system/tokens.json' with { type: 'json' };
import { appTokensCss } from './tokens-css.ts';

await writeFile(
  path.resolve(import.meta.dirname, '..', 'design', 'src', 'tokens.css'),
  appTokensCss(source),
);
