import pg from "pg";
import { createApp } from "../src/app.ts";
import { loadConfig } from "../src/config.ts";
import { testDatabaseUrl } from "./global-setup.ts";

export function createTestContext() {
  const databaseUrl = testDatabaseUrl();
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const config = {
    ...loadConfig({
      ...process.env,
      DATABASE_URL: databaseUrl,
      NODE_ENV: "test",
      SESSION_SECRET: "rahasia-tes",
    }),
    databaseUrl,
    secureCookies: false,
  };
  const app = createApp({ pool, config });

  return {
    pool,
    app,
    config,
    reset: () => pool.query("TRUNCATE sesi, akun RESTART IDENTITY CASCADE"),
    close: () => pool.end(),
  };
}
