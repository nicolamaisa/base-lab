# Dockerfile for the Worker app
# 1. Stage di Build
FROM node:24-bookworm-slim AS build
WORKDIR /app

# Copiamo i file di configurazione globali dalla root del progetto
COPY package.json package-lock.json tsconfig.base.json ./

# Copiamo la cartella specifica dell'app (worker)
COPY apps/worker ./apps/worker

# Ci spostiamo dentro la cartella dell'app per buildare
WORKDIR /app/apps/worker
RUN npm ci
RUN npm run build

# 2. Stage di Runtime
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

# Copiamo solo il necessario dal build
COPY --from=build /app/apps/worker/package.json ./
COPY --from=build /app/apps/worker/package-lock.json ./
COPY --from=build /app/apps/worker/dist ./dist

# Installiamo solo le dipendenze di produzione
RUN npm ci --omit=dev

RUN groupadd --system app && useradd --system --gid app --create-home app
USER app

EXPOSE 3001
CMD ["node", "dist/index.js"]