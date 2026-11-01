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
make dist        # vite build
make check       # all five, in that order
```

Anything else: `make pnpm ARGS="add hono"` and `make wrangler ARGS="d1 info trainote"`.

After changing `worker/db/schema.ts`, run `make db-generate` and commit the new file under `migrations/`. After changing bindings or vars in `wrangler.jsonc`, run `make typegen` and commit `worker-configuration.d.ts`.

wrangler authenticates with the API token in `.env` (`CLOUDFLARE_API_TOKEN=...`, ignored by git; `docs/requirements.md` says which token). `make whoami` shows the account it reaches, and `make secret NAME=VAPID_PRIVATE_KEY < file` stores a Worker secret.

## Deploying

A push to `main` runs the checks, applies the migrations to the remote D1 and deploys the Worker from the `deploy` environment. Nothing is deployed from a pull request.
