FROM node:20-alpine AS builder

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
RUN pnpm --filter @vortex/api build

FROM node:20-alpine AS runtime

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile --prod --filter @vortex/api...

COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/apps/api/dist apps/api/dist

WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3333

CMD ["node", "dist/server.js"]
