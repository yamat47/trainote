# trainote

A one-person body-make note for an iPhone home screen. The design and the decisions behind it are in [docs/requirements.md](docs/requirements.md); the visual source is in [design/](design/README.md).

## Stack

Vite, React and TypeScript on one Cloudflare Worker that serves the app and a Hono API, with D1 through Drizzle. Cloudflare Access signs the owner in; the Worker only reads the identity Access attaches. Dependencies stay on their latest releases through Dependabot.

## Working on it

Node 26 and pnpm 12 (`npm install -g pnpm`; the exact version is in `package.json`).

```sh
pnpm install
pnpm db:migrate:local   # applies migrations/ to the local D1
pnpm dev                # Vite with the Worker and a local D1; Access is faked from wrangler.jsonc
```

Checks, the same ones CI runs:

```sh
pnpm lint        # oxlint with type-aware rules, then prettier --check
pnpm typecheck   # tsc -b over the app, the Worker and the config files
pnpm test        # vitest
pnpm build       # vite build
pnpm db:check    # the committed migrations match worker/db/schema.ts
```

After changing `worker/db/schema.ts`, run `pnpm db:generate` and commit the new file under `migrations/`. After changing bindings or vars in `wrangler.jsonc`, run `pnpm cf-typegen` and commit `worker-configuration.d.ts`.

## Deploying

A push to `main` runs the checks, applies the migrations to the remote D1 and deploys the Worker from the `deploy` environment. Nothing is deployed from a pull request.
