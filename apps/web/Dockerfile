# Dockerfile per il frontend web di XMail
FROM node:25-bookworm-slim AS build
WORKDIR /app

# Copia file per il build (se il web estende tsconfig.base)
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/web ./apps/web

ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

WORKDIR /app/apps/web
RUN npm ci
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine
USER nginx

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 8080