import pg from "pg";
import { loadConfig } from "./config.ts";
import { jalankanSeed } from "./seed/index.ts";

export * from "./seed/index.ts";

if (import.meta.main) {
  const { migrate } = await import("./migrate.ts");

  const config = loadConfig();
  if (config.nodeEnv === "production" && !process.env.ADMIN_PASSWORD) {
    throw new Error(
      "ADMIN_PASSWORD wajib diisi saat menjalankan seed di produksi.",
    );
  }

  await migrate(config.databaseUrl, console.log);

  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  pool.on("error", (error) => console.error("Pool error", error));
  try {
    await jalankanSeed(pool, config);
  } finally {
    await pool.end();
  }
}
