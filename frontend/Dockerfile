FROM node:26-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci && npm cache clean --force

COPY tsconfig.base.json ./
COPY shared ./shared
COPY frontend ./frontend
RUN npm run build --workspace frontend

FROM nginx:1.27-alpine

# Template diproses entrypoint nginx (envsubst) agar redirect HTTP -> HTTPS
# mengenal port HTTPS kustom saat uji lokal.
COPY frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80 443

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=12 \
  CMD wget --no-check-certificate -qO- https://127.0.0.1/api/health >/dev/null || exit 1

# Entrypoint bawaan image nginx menjalankan envsubst lalu nginx.
