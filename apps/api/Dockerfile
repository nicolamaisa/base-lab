# Dockerfile for the API app
# 1. Stage di Build
FROM node:25-bookworm-slim AS build
WORKDIR /app

# Copiamo i file di configurazione globali dalla root del progetto
COPY tsconfig.base.json ./
COPY apps/api/package.json apps/api/package-lock.json ./apps/api/

# Copiamo la cartella specifica dell'app (api)
COPY apps/api ./apps/api

# Ci spostiamo dentro la cartella dell'app per buildare
WORKDIR /app/apps/api
RUN npm ci
RUN npm run build

# 2. Stage di Runtime
FROM node:25-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

# Copiamo solo il necessario dal build
COPY --from=build /app/apps/api/package.json ./
COPY --from=build /app/apps/api/package-lock.json ./
COPY --from=build /app/apps/api/dist ./dist

# Installiamo solo le dipendenze di produzione
RUN npm ci --omit=dev

RUN groupadd --system app && useradd --system --gid app --create-home app
USER app

EXPOSE 3000
CMD ["node", "dist/server.js"]