import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";
import { createApp } from "../src/app.ts";
import { loadConfig } from "../src/config.ts";
import { cariBiner } from "./audio-helper.ts";
import { testDatabaseUrl } from "./global-setup.ts";

export function createTestContext() {
  const databaseUrl = testDatabaseUrl();
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const audioDir = mkdtempSync(path.join(tmpdir(), "musicpedia-audio-"));
  const config = {
    ...loadConfig({
      ...process.env,
      DATABASE_URL: databaseUrl,
      NODE_ENV: "test",
      SESSION_SECRET: "rahasia-tes",
      AUDIO_DIR: audioDir,
      FFMPEG_PATH: process.env.FFMPEG_PATH ?? cariBiner("ffmpeg"),
    }),
    databaseUrl,
    secureCookies: false,
  };
  const app = createApp({ pool, config });

  return {
    pool,
    app,
    config,
    audioDir,
    reset: () => pool.query("TRUNCATE sesi, akun RESTART IDENTITY CASCADE"),
    close: async () => {
      await pool.end();
      rmSync(audioDir, { recursive: true, force: true });
    },
  };
}
