import express from "express";
import type { ErrorRequestHandler } from "express";
import type { ErrorResponse, HealthResponse } from "@musicpedia/shared";
import type { Config } from "./config.ts";
import { createAuthController } from "./controllers/auth-controller.ts";
import type { Pool } from "./db.ts";
import { AppError } from "./errors.ts";
import { createAuthMiddleware } from "./middleware/auth.ts";
import { createAkunRepository } from "./repositories/akun-repository.ts";
import { createAdminRouter } from "./routes/admin-routes.ts";
import { createAuthRouter } from "./routes/auth-routes.ts";
import { createSessionMiddleware } from "./session.ts";
import { createAuthService } from "./services/auth-service.ts";

export interface AppDeps {
  pool: Pool;
  config: Config;
}

const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    const body: ErrorResponse = { error: error.message, code: error.code };
    res.status(error.status).json(body);
    return;
  }
  console.error(error);
  const body: ErrorResponse = {
    error: "Terjadi kesalahan pada server.",
    code: "KESALAHAN_SERVER",
  };
  res.status(500).json(body);
};

export function createApp({ pool, config }: AppDeps) {
  const app = express();
  if (config.secureCookies) {
    app.set("trust proxy", 1);
  }
  app.use(express.json());

  const akunRepo = createAkunRepository(pool);
  const authService = createAuthService(akunRepo);
  const authController = createAuthController({ authService });
  const authMiddleware = createAuthMiddleware(akunRepo);

  app.use(createSessionMiddleware(pool, config));
  app.use(authMiddleware.muatAkunAktif);

  app.get("/api/health", async (_req, res) => {
    await pool.query("SELECT 1");
    const body: HealthResponse = { status: "ok", database: "up" };
    res.json(body);
  });

  app.use("/api/auth", createAuthRouter(authController));
  app.use("/api/admin", createAdminRouter(authMiddleware));

  app.use(handleError);

  return app;
}
