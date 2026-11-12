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
  midtransServerKey: string;
  midtransClientKey: string;
  midtransProduction: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = env.PORT ? Number(env.PORT) : 3000;
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PORT tidak valid: ${env.PORT}`);
  }
  const nodeEnv = env.NODE_ENV ?? "development";
  const isProduction = nodeEnv === "production";
  const sessionSecret =
    env.SESSION_SECRET ??
    (isProduction
      ? undefined
      : "rahasia-pengembangan-musicpedia-jangan-dipakai-di-produksi");
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET wajib diisi di produksi.");
  }
  if (isProduction && sessionSecret.length < 32) {
    throw new Error(
      "SESSION_SECRET di produksi wajib minimal 32 karakter. Buat dengan `openssl rand -base64 32`.",
    );
  }
  if (isProduction && !env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL wajib diisi di produksi lewat environment, bukan nilai bawaan pengembangan.",
    );
  }
  return {
    port,
    databaseUrl:
      env.DATABASE_URL ??
      "postgres://musicpedia:musicpedia@localhost:5433/musicpedia",
    nodeEnv,
    sessionSecret,
    secureCookies: isProduction,
    adminEmail: env.ADMIN_EMAIL ?? "admin@musicpedia.id",
    adminPassword: env.ADMIN_PASSWORD ?? "admin12345",
    audioDir: path.resolve(env.AUDIO_DIR ?? "audio"),
    ffmpegPath: env.FFMPEG_PATH ?? "ffmpeg",
    midtransServerKey: env.MIDTRANS_SERVER_KEY ?? "",
    midtransClientKey: env.MIDTRANS_CLIENT_KEY ?? "",
    midtransProduction: env.MIDTRANS_PRODUCTION === "true",
  };
}
