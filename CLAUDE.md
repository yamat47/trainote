# trainote

The design and every decision are in `docs/requirements.md`; read it before changing anything.

## Toolchain

Node, pnpm, wrangler and the tests run in the container from `compose.yaml`, never on the host. The host has git, gh and docker; it does not have the right Node and is not meant to get one. Every command goes through `make` (`make help` lists them):

```sh
make build          # once, and after Dockerfile or package.json change
make install        # after pnpm-lock.yaml changes
make migrate-local  # applies migrations/ to the local D1
make dev            # http://localhost:5173, with the fake Access identity from wrangler.jsonc
make check          # lint, typecheck, test, db:check, build: what CI runs
make pnpm ARGS="add hono"
make wrangler ARGS="d1 info trainote"
```

`make` reuses the dev server's container when it is running and starts a one-off one otherwise.

## Files not to read or copy

`.env` holds the Cloudflare API token that wrangler uses from the container, and `.dev.vars` holds the Worker's local secrets. Do not print them, quote them, or write their values anywhere else.

## Conventions

Commit messages and pull requests are English Conventional Commits, written as `docs/requirements.md` says: no `Co-Authored-By`, session URL or "Generated with" line.
