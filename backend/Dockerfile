FROM node:26-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev

COPY tsconfig.base.json ./
COPY shared ./shared
COPY backend ./backend

RUN mkdir -p /data/audio
ENV AUDIO_DIR=/data/audio

EXPOSE 3000
CMD ["node", "backend/src/server.ts"]
