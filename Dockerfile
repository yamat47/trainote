# The development toolchain: Node, pnpm, git and everything under node_modules.
# The source is bind-mounted at /workspace by compose.yaml, so nothing is copied in.
FROM node:26-bookworm-slim@sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9

# git: `pnpm db:check` reads `git status` to tell whether the migrations changed.
# The bind mount shows up with another owner than the user git runs as, which git
# refuses by default.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git \
  && rm -rf /var/lib/apt/lists/* \
  && git config --system --add safe.directory /workspace

# Node 25 and later ship without corepack, so pnpm comes from npm, at the version
# package.json names in `packageManager`.
COPY package.json /tmp/package.json
RUN npm install -g "pnpm@$(node -p "require('/tmp/package.json').packageManager.split('@')[1]")" \
  && npm cache clean --force \
  && rm /tmp/package.json

# The mount point of the node_modules volume exists here, owned by node, so that a
# fresh volume takes that ownership instead of root's.
RUN mkdir -p /workspace/node_modules && chown -R node:node /workspace

USER node
WORKDIR /workspace
