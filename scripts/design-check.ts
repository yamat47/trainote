// The app is built from the design system alone: nothing under src/ is a stylesheet, and
// no JSX there names a class. A class or a rule the app wants is a component the design
// system lacks (docs/design.md).
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'src');

async function* files(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else yield full;
  }
}

const findings: string[] = [];
for await (const file of files(root)) {
  const relative = path.relative(path.dirname(root), file);
  if (file.endsWith('.css')) findings.push(`${relative}: a stylesheet under src/`);
  if (!file.endsWith('.tsx')) continue;
  const lines = (await readFile(file, 'utf8')).split('\n');
  lines.forEach((line, i) => {
    if (/\bclassName\s*=/.test(line)) {
      findings.push(`${relative}:${String(i + 1)}: className in the app`);
    }
  });
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  console.error('\nThe app writes no CSS; add the component to design/src instead.');
  process.exit(1);
}
console.log('src/ holds no stylesheet and names no class.');
