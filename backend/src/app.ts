import express from "express";
import type { HealthResponse } from "@musicpedia/shared";
import type { Config } from "./config.ts";
import type { Pool } from "./db.ts";
import { katalogRouter } from "./katalog/controller.ts";

export interface AppDeps {
  pool: Pool;
  config: Config;
}

export function createApp({ pool }: AppDeps) {
  const app = express();
  app.use(express.json());

  app.get("/api/health", async (_req, res) => {
    await pool.query("SELECT 1");
    const body: HealthResponse = { status: "ok", database: "up" };
    res.json(body);
  });

  app.use("/api", katalogRouter(pool));

  return app;
}
