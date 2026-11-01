# trainote

A one-person body-make note for an iPhone home screen. The design and the decisions behind it are in [docs/requirements.md](docs/requirements.md); the visual source is in [design/](design/README.md).

## Stack

Vite, React and TypeScript on one Cloudflare Worker that serves the app and a Hono API, with D1 through Drizzle. Cloudflare Access signs the owner in; the Worker only reads the identity Access attaches. Dependencies stay on their latest releases through Dependabot.

## Working on it

The toolchain (Node 26, pnpm, wrangler, the tests) runs in a Docker container; the host needs git, gh and docker, nothing else. Every command goes through `make`, which reuses the dev server's container when it is running and starts a one-off one otherwise. `make help` lists the targets.

```sh
make build          # the toolchain image; again after Dockerfile or the packageManager field changes
make install        # pnpm install from the lockfile, into a volume
make migrate-local  # applies migrations/ to the local D1
make dev            # Vite with the Worker and a local D1 on http://localhost:5173; Access is faked from wrangler.jsonc
```

The container watches the source by polling, because colima's virtiofs mount passes no file change events; if your Docker runtime does pass them, drop `CHOKIDAR_USEPOLLING` from `compose.yaml`.

Checks, the same ones CI runs:

```sh
make lint        # oxlint with type-aware rules, then prettier --check
make typecheck   # tsc -b over the app, the Worker and the config files
make test        # vitest
make db-check    # the committed migrations match worker/db/schema.ts
make tokens-check # the committed design/src/tokens.css matches design/system/tokens.json
make design-check # src/ holds no stylesheet and names no class
make project-check # the committed design/project/ matches the build from design/
make dist        # vite build
make storybook-dist # Storybook builds into dist-storybook/
make check       # all of them, in that order
```

`make storybook` serves the design system's components and tokens on http://localhost:6006 from its own container, beside the dev server or on its own; `docs/design.md` says how the design system is kept and published.

Anything else: `make pnpm ARGS="add hono"` and `make wrangler ARGS="d1 info trainote"`.

After changing `worker/db/schema.ts`, run `make db-generate` and commit the new file under `migrations/`. After changing bindings or vars in `wrangler.jsonc`, run `make typegen` and commit `worker-configuration.d.ts`. After changing the design tokens in `design/system/tokens.json`, run `make tokens` and commit `design/src/tokens.css`. After changing anything under `design/src/` or `design/system/`, run `make project` and commit `design/project/`, the files the design-system artifact is published from (`docs/design.md`). The home-screen icons under `public/icons/` are drawn by opening `scripts/icon.html` in Safari on a Mac and saving the three files it offers.

wrangler authenticates with the API token in `.env` (`CLOUDFLARE_API_TOKEN=...`, ignored by git; `docs/requirements.md` says which token). `make whoami` shows the account it reaches, and `make secret NAME=VAPID_PRIVATE_KEY < file` stores a Worker secret.

Reading a note into entries calls the Claude API, so `.dev.vars` needs `ANTHROPIC_API_KEY=...` (ignored by git) before the Notes tab works locally. The model is the `STRUCTURE_MODEL` var in `wrangler.jsonc`.

The Sunday reminder runs from a cron trigger; `make scheduled` fires it against the dev server, and the Profile tab has a row that sends it to the signed-in owner's own subscriptions at once.

## Deploying

A push to `main` runs the checks, applies the migrations to the remote D1 and deploys the Worker from the `deploy` environment. Nothing is deployed from a pull request.
