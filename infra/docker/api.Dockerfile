FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN pnpm --filter @vortex/shared build

EXPOSE 3333

# Bind-mounted volumes (see docker-compose.yml) overwrite the image's build
# output, so @vortex/shared is rebuilt on every container start before the
# API dev server boots.
CMD ["sh", "-c", "pnpm --filter @vortex/shared build && pnpm --filter @vortex/api dev"]
