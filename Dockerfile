# Corepack is deprecated and dropped from newer Node releases, so pnpm is
# installed explicitly. Keep PNPM_VERSION in sync with "packageManager" in package.json.
ARG PNPM_VERSION=10.33.4

FROM node:24-alpine AS deps
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:24-alpine AS build
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:24-alpine AS runtime
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
# Uploads with STORAGE_DRIVER=local; mount a volume here to keep them.
RUN mkdir -p /app/storage && chown node:node /app/storage
VOLUME /app/storage
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
