import path from "node:path";

export interface Config {
  port: number;
  databaseUrl: string;
  nodeEnv: string;
  sessionSecret: string;
  secureCookies: boolean;
  adminEmail: string;
  adminPassword: string;
  audioDir: string;
  ffmpegPath: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = env.PORT ? Number(env.PORT) : 3000;
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PORT tidak valid: ${env.PORT}`);
  }
  const nodeEnv = env.NODE_ENV ?? "development";
  const sessionSecret =
    env.SESSION_SECRET ??
    (nodeEnv === "production"
      ? undefined
      : "rahasia-pengembangan-musicpedia-jangan-dipakai-di-produksi");
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET wajib diisi di produksi.");
  }
  return {
    port,
    databaseUrl:
      env.DATABASE_URL ??
      "postgres://musicpedia:musicpedia@localhost:5433/musicpedia",
    nodeEnv,
    sessionSecret,
    secureCookies: nodeEnv === "production",
    adminEmail: env.ADMIN_EMAIL ?? "admin@musicpedia.id",
    adminPassword: env.ADMIN_PASSWORD ?? "admin12345",
    audioDir: path.resolve(env.AUDIO_DIR ?? "audio"),
    ffmpegPath: env.FFMPEG_PATH ?? "ffmpeg",
  };
}
