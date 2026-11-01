// Builds design/project/, the files the design-system artifact on claude.ai is made of,
// from design/src and design/system. The artifact's page reads them in the shape its
// type fixes: one classic script assigning window.Trainote, its stylesheet, one
// index.d.ts, and per component a README and a small preview page. Stories are the
// previews' source, so a preview cannot show a prop the component lacks.
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import vm from 'node:vm';
import { Fragment, isValidElement, type ReactElement } from 'react';
import { storyNameFromExport } from 'storybook/internal/csf';
import { build, createServer } from 'vite';
import { card, type Card } from '../.storybook/card.ts';
import tokens from '../design/system/tokens.json' with { type: 'json' };
import { artifactTokensCss } from './tokens-css.ts';

const NAMESPACE = 'Trainote';
const repo = path.resolve(import.meta.dirname, '..');
const src = path.join(repo, 'design', 'src');
const system = path.join(repo, 'design', 'system');
const out = path.join(repo, 'design', 'project');
const components = path.join(out, 'components');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const record = (value: unknown): Record<string, unknown> | undefined =>
  isRecord(value) ? value : undefined;

// The catalogue: every component index.ts exports, in its order. One export per line,
// named as its file, so that nothing reaches the bundle without a card.
async function exported(): Promise<string[]> {
  const index = await readFile(path.join(src, 'index.ts'), 'utf8');
  const names = index
    .split('\n')
    .filter((line) => line.startsWith('export {'))
    .map((line) => {
      const name = /^export \{ (\w+) \} from '\.\/\1\.tsx';$/.exec(line)?.[1];
      if (name === undefined)
        throw new Error(`design/src/index.ts: not one component from its file: ${line}`);
      return name;
    });
  if (names.length === 0) throw new Error('design/src/index.ts exports no component');
  return names;
}

// One IIFE over window.React: the classic JSX transform leaves `React.createElement`
// calls, which resolve to the global the artifact's page provides.
async function bundle(names: string[]): Promise<void> {
  const banner = `/* @ds-bundle: ${JSON.stringify({ format: 4, namespace: NAMESPACE, components: names.map((name) => ({ name })) })} */`;
  await build({
    configFile: false,
    root: repo,
    logLevel: 'warn',
    oxc: {
      jsx: { runtime: 'classic', pragma: 'React.createElement', pragmaFrag: 'React.Fragment' },
    },
    build: {
      outDir: components,
      emptyOutDir: false,
      copyPublicDir: false,
      // Readable, so a change to the mirror reads in a pull request.
      minify: false,
      lib: {
        entry: path.join(src, 'index.ts'),
        name: NAMESPACE,
        formats: ['iife'],
        fileName: () => 'bundle.js',
        cssFileName: 'bundle',
      },
      rolldownOptions: {
        external: ['react', 'react-dom'],
        output: { globals: { react: 'React', 'react-dom': 'ReactDOM' }, banner },
      },
    },
  });
  const text = await readFile(path.join(components, 'bundle.js'), 'utf8');
  if (/<\/script|<!--/i.test(text)) {
    throw new Error('bundle.js holds </script or <!--, which a page cannot inline');
  }
  if (/<\/style/i.test(await readFile(path.join(components, 'bundle.css'), 'utf8'))) {
    throw new Error('bundle.css holds </style, which a page cannot inline');
  }
  // The page runs the bundle as a classic script: `var Trainote` at the top level has to
  // become the page's global, with every component on it.
  const sandbox: Record<string, unknown> = { React: { createElement() {}, Fragment: {} } };
  vm.runInNewContext(text, sandbox);
  const defined = Object.keys(record(sandbox[NAMESPACE]) ?? {});
  const missing = names.filter((name) => !defined.includes(name));
  if (missing.length > 0) throw new Error(`bundle.js does not define ${missing.join(', ')}`);
}

// One index.d.ts: tsc emits a declaration per source file; this joins them, lifts the
// React imports to the top and adds the window global the page documents.
async function declarations(names: string[]): Promise<void> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'design-types-'));
  try {
    await promisify(execFile)(
      path.join(repo, 'node_modules', '.bin', 'tsc'),
      ['-p', 'tsconfig.design.json', '--outDir', dir],
      { cwd: repo },
    );
    const reactImports = new Set<string>();
    const declared = new Map<string, string>();
    const bodies: string[] = [];
    // Every declaration tsc wrote: the shared modules first, then the components in order.
    const emitted = (await readdir(dir))
      .filter((file) => file.endsWith('.d.ts') && file !== 'index.d.ts')
      .map((file) => file.slice(0, -'.d.ts'.length));
    const shared = emitted.filter((name) => !names.includes(name)).toSorted();
    const files = await Promise.all(
      [...shared, ...names].map(
        async (name) => [name, await readFile(path.join(dir, `${name}.d.ts`), 'utf8')] as const,
      ),
    );
    for (const [name, text] of files) {
      const lines = text.split('\n').filter((line) => {
        const react = /^import type \{ ([^}]+) \} from 'react';$/.exec(line);
        if (react?.[1] !== undefined) {
          react[1].split(',').forEach((spec) => reactImports.add(spec.trim()));
          return false;
        }
        if (/^import .* from '\.\//.test(line) || line === 'export {};') return false;
        if (/^import\b/.test(line)) throw new Error(`${name}.d.ts: unexpected import: ${line}`);
        return true;
      });
      for (const line of lines) {
        const own = /^(?:export )?(?:declare )?(?:type|interface|function|const) (\w+)/.exec(
          line,
        )?.[1];
        if (own === undefined) continue;
        const elsewhere = declared.get(own);
        if (elsewhere !== undefined && elsewhere !== name) {
          throw new Error(
            `${own} is declared in both ${elsewhere}.tsx and ${name}.tsx; one index.d.ts cannot hold both`,
          );
        }
        declared.set(own, name);
      }
      bodies.push(`// ${name}.${names.includes(name) ? 'tsx' : 'ts'}\n${lines.join('\n').trim()}`);
    }
    const global = [
      'declare global {',
      '  interface Window {',
      `    ${NAMESPACE}: {`,
      ...names.map((name) => `      ${name}: typeof ${name};`),
      '    };',
      '  }',
      '}',
    ].join('\n');
    await writeFile(
      path.join(components, 'index.d.ts'),
      [
        `// Generated from design/src by scripts/project.ts: the types of window.${NAMESPACE}.`,
        `import type { ${[...reactImports].toSorted().join(', ')} } from 'react';`,
        '',
        ...bodies.map((body) => `${body}\n`),
        global,
        '',
      ].join('\n'),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Writes a story's args as the JavaScript of a preview: literals as they are, a handler
// as an empty function, a React element as the createElement call that makes it.
class Writer {
  readonly #names: Map<unknown, string>;

  constructor(names: Map<unknown, string>) {
    this.#names = names;
  }

  js(value: unknown, where: string): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      // `<` as an escape, so no string can close the preview's <script>.
      return JSON.stringify(value).replaceAll('<', '\\u003c');
    }
    if (typeof value === 'function') return 'function () {}';
    if (Array.isArray(value)) {
      return `[${value.map((item, i) => this.js(item, `${where}[${String(i)}]`)).join(', ')}]`;
    }
    if (isValidElement(value)) return this.element(value, where);
    const object = record(value);
    if (object === undefined || Object.getPrototypeOf(object) !== Object.prototype) {
      throw new Error(`${where}: a preview cannot carry a ${typeof value}`);
    }
    const entries = Object.entries(object).map(
      ([key, item]) => `${JSON.stringify(key)}: ${this.js(item, `${where}.${key}`)}`,
    );
    return entries.length === 0 ? '{}' : `{ ${entries.join(', ')} }`;
  }

  element(element: ReactElement, where: string): string {
    const { type } = element;
    let tag: string;
    if (type === Fragment) tag = 'React.Fragment';
    else if (typeof type === 'string') tag = JSON.stringify(type);
    else {
      const name = this.#names.get(type);
      if (name === undefined) {
        const shown = typeof type === 'function' ? type.name : String(type);
        throw new Error(
          `${where}: <${shown}> is not a design component, so a preview cannot render it`,
        );
      }
      tag = `T.${name}`;
    }
    const props = record(element.props) ?? {};
    return this.call(tag, element.key === null ? props : { key: element.key, ...props }, where);
  }

  // `h(tag, props, ...children)`, the children as arguments as JSX would pass them.
  call(tag: string, { children, ...props }: Record<string, unknown>, where: string): string {
    const list = children === undefined ? [] : Array.isArray(children) ? children : [children];
    const args = [
      Object.keys(props).length === 0 ? 'null' : this.js(props, where),
      ...list.map((child: unknown, i) => this.js(child, `${where}>${String(i)}`)),
    ];
    return `h(${tag}, ${args.join(', ')})`;
  }
}

// Keeps a controlled component's value in the card, so the story can be used there.
const LIVE =
  'function Live(p) { var state = React.useState(p.args[p.value]); var args = Object.assign({}, p.args); args[p.value] = state[0]; args[p.onChange] = state[1]; return h(p.of, args); }';

type Story = { title: string; code: string };

function page(name: string, group: string, config: Card, list: Story[]): string {
  const marker = [
    `group="${group}"`,
    config.height === undefined ? undefined : `height=${String(config.height)}`,
    config.width === undefined ? undefined : `width=${String(config.width)}`,
    `subtitle="${list.map((story) => story.title).join(', ')}"`,
  ]
    .filter((part) => part !== undefined)
    .join(' ');
  const styles = [
    config.background === 'grouped' ? 'body { background: var(--grouped-background); }' : undefined,
    config.fontSize === undefined
      ? undefined
      : `#root { font-size: ${String(config.fontSize)}px; line-height: 1; }`,
    config.layout === 'row'
      ? '#root { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 12px 16px; }'
      : undefined,
    config.layout === 'phones'
      ? '#root { display: flex; gap: 16px; align-items: flex-start; } #root > div { width: 390px; flex: none; }'
      : undefined,
  ].filter((part) => part !== undefined);
  const children = list.map((story) =>
    config.layout === 'phones' ? `h("div", null, ${story.code})` : story.code,
  );
  return [
    `<!-- @dsCard ${marker} -->`,
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${name}</title>`,
    ...(styles.length === 0 ? [] : [`<style>${styles.join(' ')}</style>`]),
    '</head>',
    '<body>',
    '<div id="root"></div>',
    '<script>',
    `var T = window.${NAMESPACE}, h = React.createElement;`,
    ...(config.controlled === undefined ? [] : [LIVE]),
    'ReactDOM.createRoot(document.getElementById("root")).render(',
    '  h(React.Fragment, null,',
    `    ${children.join(',\n    ')}`,
    '  )',
    ');',
    '</script>',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

// A `render` or `decorators` would draw what the card cannot see.
function owned(fields: Record<string, unknown>, at: string): void {
  for (const key of ['render', 'decorators']) {
    if (fields[key] !== undefined) {
      throw new Error(`${at}: a ${key} cannot reach the card; say it in args or parameters.card`);
    }
  }
}

// A story file's meta and stories, read through Vite so the args are the real values.
// What the card cannot show is refused rather than dropped: a `render` or `decorators`,
// a framing the card vocabulary lacks.
function stories(
  module: Record<string, unknown>,
  name: string,
  library: Record<string, unknown>,
  writer: Writer,
): { group: string; config: Card; stories: Story[] } {
  const where = `${name}.stories.tsx`;
  const meta = record(module['default']);
  const title = meta?.['title'];
  if (meta === undefined || typeof title !== 'string')
    throw new Error(`${where}: no meta with a title`);
  const config = card(meta['parameters'], where);
  owned(meta, where);
  const list = Object.entries(module).flatMap(([exportName, story]): Story[] => {
    const fields = record(story);
    if (exportName === 'default' || fields === undefined) return [];
    const at = `${where} ${exportName}`;
    owned(fields, at);
    const args = { ...record(meta['args']), ...record(fields['args']) };
    const storyName = fields['name'];
    const code =
      config.controlled === undefined
        ? writer.call(`T.${name}`, args, at)
        : `h(Live, { of: T.${name}, value: ${JSON.stringify(config.controlled.value)}, onChange: ${JSON.stringify(config.controlled.onChange)}, args: ${writer.js(args, at)} })`;
    return [
      { title: typeof storyName === 'string' ? storyName : storyNameFromExport(exportName), code },
    ];
  });
  if (list.length === 0) throw new Error(`${where}: no story`);
  if (typeof library[name] !== 'function') throw new Error(`${where}: index.ts exports no ${name}`);
  return { group: title.split('/')[0] ?? title, config, stories: list };
}

// Per component: its guideline as the README, and a preview from its stories.
async function previews(names: string[]): Promise<void> {
  const server = await createServer({
    configFile: false,
    root: repo,
    logLevel: 'warn',
    appType: 'custom',
    server: { middlewareMode: true, watch: null, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true },
    resolve: {
      alias: [
        { find: 'storybook/test', replacement: path.join(repo, 'scripts', 'storybook-stubs.ts') },
      ],
    },
  });
  try {
    const library = await server.ssrLoadModule('/design/src/index.ts');
    // index.ts text gives the order; the module says what it really exports.
    const extra = Object.keys(library).filter(
      (key) => typeof library[key] === 'function' && !names.includes(key),
    );
    if (extra.length > 0) {
      throw new Error(
        `design/src/index.ts exports ${extra.join(', ')} in a form scripts/project.ts does not read`,
      );
    }
    const writer = new Writer(new Map(names.map((name) => [library[name], name])));
    await Promise.all(
      names.map(async (name) => {
        const module = await server.ssrLoadModule(`/design/src/${name}.stories.tsx`);
        const { group, config, stories: list } = stories(module, name, library, writer);
        const dir = path.join(components, name);
        await mkdir(dir, { recursive: true });
        await Promise.all([
          writeFile(path.join(dir, 'preview.html'), page(name, group, config, list)),
          cp(path.join(src, `${name}.md`), path.join(dir, 'README.md')),
        ]);
      }),
    );
  } finally {
    await server.close();
  }
}

// The brand book, the tokens, the fonts and the cover, copied as they are, and tokens.css
// in the page's shape, since a page kept in code writes no file of its own.
async function copies(): Promise<void> {
  await mkdir(path.join(components, 'Cover'), { recursive: true });
  await Promise.all([
    writeFile(path.join(out, 'tokens.css'), artifactTokensCss(tokens)),
    cp(path.join(system, 'README.md'), path.join(out, 'README.md')),
    cp(path.join(system, 'tokens.json'), path.join(out, 'tokens.json')),
    cp(path.join(system, 'fonts'), path.join(out, 'fonts'), { recursive: true }),
    cp(path.join(system, 'cover.html'), path.join(components, 'Cover', 'preview.html')),
  ]);
}

const names = await exported();
await rm(out, { recursive: true, force: true });
await mkdir(components, { recursive: true });
await Promise.all([bundle(names), declarations(names), previews(names), copies()]);
console.log(`design/project: ${String(names.length)} components (${names.join(', ')})`);
