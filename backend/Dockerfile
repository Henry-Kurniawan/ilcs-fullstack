FROM node:26-alpine

# ffmpeg dipakai untuk memvalidasi unggahan mp3 dan membuat Trial. Binernya
# ada di image, bukan di host, supaya perilaku produksi sama dengan tes.
RUN apk add --no-cache ffmpeg

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev && npm cache clean --force

COPY tsconfig.base.json ./
COPY shared ./shared
COPY backend ./backend

RUN mkdir -p /data/audio && chown -R node:node /data/audio /app
ENV AUDIO_DIR=/data/audio
ENV FFMPEG_PATH=/usr/bin/ffmpeg

USER node

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=12 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

# Migrasi dijalankan sebelum server supaya image baru selalu cocok dengan
# skema database. Server menerima SIGTERM langsung lewat exec.
CMD ["sh", "-c", "node backend/src/migrate.ts && exec node backend/src/server.ts"]
