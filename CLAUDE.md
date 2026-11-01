# trainote

The design and every decision are in `docs/requirements.md`; read it before changing anything.

## Toolchain

Node, pnpm, wrangler and the tests run in the container from `compose.yaml`, never on the host: the host has git, gh and docker and is not meant to get a Node of its own. `make` is the only entry point. The targets and the first-time steps are in the "Working on it" section of `README.md`, and `make help` prints the list.

## Files not to read or copy

`.env` holds the Cloudflare API token that wrangler uses from the container, and `.dev.vars` holds the Worker's local secrets. Do not print them, quote them, or write their values anywhere else.

## Conventions

Commit messages and pull requests are English Conventional Commits, written as `docs/requirements.md` says: no `Co-Authored-By`, session URL or "Generated with" line.
