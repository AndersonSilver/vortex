FROM node:20-alpine AS builder

ARG VITE_API_URL
ARG VITE_MERCADOPAGO_PUBLIC_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MERCADOPAGO_PUBLIC_KEY=$VITE_MERCADOPAGO_PUBLIC_KEY

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/web apps/web

RUN pnpm --filter @vortex/shared build
RUN pnpm --filter @vortex/web build

FROM nginx:alpine AS runtime

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY infra/docker/nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
