import pg from "pg";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";

const config = loadConfig();
const pool = new pg.Pool({ connectionString: config.databaseUrl });
pool.on("error", (error) => console.error("Pool error", error));
const server = createApp({ pool, config }).listen(config.port, () => {
  console.log(`Backend listening on :${config.port}`);
});

process.on("SIGTERM", () => {
  server.close(() => void pool.end());
});
