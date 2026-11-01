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

.PHONY: help build install dev down logs shell storybook storybook-dist lint typecheck test dist db-check \
  tokens-check check migrate-local db-generate typegen tokens scheduled whoami secret pnpm wrangler

help: ## This list
	@grep -hE '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | sed -E 's/^([a-z-]+):.*## /\1\t/' | sort | column -t -s "$$(printf '\t')"

build: ## Build the toolchain image
	$(COMPOSE) build

install: ## Install dependencies from the lockfile
	$(IN) pnpm install --frozen-lockfile

dev: ## Run the dev server on http://localhost:5173
	$(COMPOSE) up

down: ## Stop and remove the dev server and Storybook containers
	$(COMPOSE) --profile storybook down

logs: ## Follow the dev server output
	$(COMPOSE) logs --follow app

shell: ## A shell in the container
	$(IN) bash

storybook: ## Run Storybook on http://localhost:6006, beside the dev server or on its own
	$(COMPOSE) up storybook

storybook-dist: ## Build Storybook into dist-storybook/
	$(IN) pnpm storybook:build

lint: ## oxlint with type-aware rules, then prettier --check
	$(IN) pnpm lint

typecheck: ## tsc -b
	$(IN) pnpm typecheck

test: ## vitest
	$(IN) pnpm test

dist: ## Build the app into dist/
	$(IN) pnpm build

db-check: ## The committed migrations match worker/db/schema.ts
	$(IN) pnpm db:check

tokens-check: ## The committed design/src/tokens.css matches design/system/tokens.json
	$(IN) pnpm tokens:check

check: lint typecheck test db-check tokens-check dist storybook-dist ## The checks CI runs, in CI's order

migrate-local: ## Apply migrations/ to the local D1
	$(IN) pnpm db:migrate:local

db-generate: ## Write a migration for the current schema
	$(IN) pnpm db:generate

typegen: ## Regenerate worker-configuration.d.ts from wrangler.jsonc
	$(IN) pnpm cf-typegen

tokens: ## Regenerate design/src/tokens.css from design/system/tokens.json
	$(IN) pnpm tokens

scheduled: ## Fire the Sunday cron against the running dev server
	curl -fsS 'http://localhost:5173/cdn-cgi/local/scheduled?cron=0+11+*+*+SUN&format=json'
	@echo

whoami: ## Which Cloudflare account the token in .env reaches
	$(IN) pnpm exec wrangler whoami

secret: ## Store a Worker secret from stdin: make secret NAME=VAPID_PRIVATE_KEY < file
	$(if $(NAME),,$(error NAME is required, as in: make secret NAME=VAPID_PRIVATE_KEY < file))
	$(IN) pnpm exec wrangler secret put $(NAME)

pnpm: ## Any pnpm command: make pnpm ARGS="add hono"
	$(IN) pnpm $(ARGS)

wrangler: ## Any wrangler command: make wrangler ARGS="d1 info trainote"
	$(IN) pnpm exec wrangler $(ARGS)
