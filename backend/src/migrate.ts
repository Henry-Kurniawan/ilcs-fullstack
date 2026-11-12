import { fileURLToPath } from "node:url";
import { runner } from "node-pg-migrate";

export const migrationsDir = fileURLToPath(new URL("../migrations", import.meta.url));

export async function migrate(databaseUrl: string, log: (msg: string) => void = () => {}) {
  await runner({
    databaseUrl,
    dir: migrationsDir,
    direction: "up",
    migrationsTable: "pgmigrations",
    log,
  });
}

if (import.meta.main) {
  const { loadConfig } = await import("./config.ts");
  await migrate(loadConfig().databaseUrl, console.log);
}
