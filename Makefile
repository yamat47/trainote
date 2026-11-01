# Every Node, pnpm and wrangler command runs in the container from compose.yaml.
# Nothing here calls node on the host.

COMPOSE := docker compose

# A running dev server is reused; otherwise a one-off container is started.
RUNNING := $(shell $(COMPOSE) ps --status running --services 2>/dev/null | grep -x app)
# Claude Code and scripts call make without a terminal, where docker refuses to allocate one.
TTY := $(shell [ -t 0 ] || echo -T)
ifeq ($(RUNNING),app)
  IN := $(COMPOSE) exec $(TTY) app
else
  IN := $(COMPOSE) run --rm $(TTY) app
endif

.PHONY: help build install dev down logs shell lint typecheck test dist db-check check \
  migrate-local db-generate typegen whoami secret pnpm wrangler

help: ## This list
	@grep -hE '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | sed -E 's/^([a-z-]+):.*## /\1\t/' | sort | column -t -s "$$(printf '\t')"

build: ## Build the toolchain image
	$(COMPOSE) build

install: ## Install dependencies from the lockfile
	$(IN) pnpm install --frozen-lockfile

dev: ## Run the dev server on http://localhost:5173
	$(COMPOSE) up

down: ## Stop and remove the dev server container
	$(COMPOSE) down

logs: ## Follow the dev server output
	$(COMPOSE) logs --follow app

shell: ## A shell in the container
	$(IN) bash

lint:
	$(IN) pnpm lint

typecheck:
	$(IN) pnpm typecheck

test:
	$(IN) pnpm test

dist: ## Build the app into dist/
	$(IN) pnpm build

db-check: ## The committed migrations match worker/db/schema.ts
	$(IN) pnpm db:check

check: lint typecheck test db-check dist ## The checks CI runs, in CI's order

migrate-local: ## Apply migrations/ to the local D1
	$(IN) pnpm db:migrate:local

db-generate: ## Write a migration for the current schema
	$(IN) pnpm db:generate

typegen: ## Regenerate worker-configuration.d.ts from wrangler.jsonc
	$(IN) pnpm cf-typegen

whoami: ## Which Cloudflare account the token in .env reaches
	$(IN) pnpm exec wrangler whoami

secret: ## Store a Worker secret from stdin: make secret NAME=VAPID_PRIVATE_KEY < file
	$(if $(NAME),,$(error NAME is required, as in: make secret NAME=VAPID_PRIVATE_KEY < file))
	$(IN) pnpm exec wrangler secret put $(NAME)

pnpm: ## Any pnpm command: make pnpm ARGS="add hono"
	$(IN) pnpm $(ARGS)

wrangler: ## Any wrangler command: make wrangler ARGS="d1 info trainote"
	$(IN) pnpm exec wrangler $(ARGS)
